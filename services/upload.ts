import { File, FileMode, Paths, UploadType } from 'expo-file-system';
import { BASE_URL } from '@/utils/fetchWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedFile } from '@/components/ui/UploadField';

export type UploadPurpose = 'prescription' | 'report' | 'document';

/**
 * Patient file uploads — presigned, straight to S3.
 *
 * HOW THIS WORKS, AND WHY IT CHANGED
 * The app used to POST the file to /mobile-app/upload, which held it in the
 * API process's memory and forwarded it to S3. That capped a file at 10 MB and
 * it could not be raised: the box has ~1.5 GB of RAM free and also serves the
 * website, so five 50 MB files on one request is 250 MB of heap, and a few
 * concurrent uploads would take the site down.
 *
 * Now the app asks the API for a signed URL, sends the BYTES DIRECTLY TO S3,
 * and tells the API when it is done:
 *
 *   POST /upload/presign   { purpose, files:[{name,type,size}] }  -> url(s)
 *   PUT  <signed S3 url>   the file, or one part of it
 *   POST /upload/complete  { key, uploadId?, parts? }             -> key
 *
 * The API never sees a byte, so the limit is about what a phone can send
 * rather than what this server can hold. Files over 8 MB go up as S3 multipart
 * parts, so a part that fails on a hospital connection costs one part instead
 * of the whole upload.
 *
 * WHY expo-file-system AND NOT fetch
 * A `fetch` with a FormData file gives no progress and no way to send a byte
 * range. `File.upload()` streams the file from disk natively and reports
 * bytesSent, which is what makes a real percentage possible instead of a
 * spinner that knows nothing.
 *
 * Files still land under the private `patient-docs/` prefix and are read back
 * only through short-lived presigned URLs. The object key is built by the
 * server and contains the patient id, so the app cannot choose where its file
 * goes — that key is the whole ownership check on the read route.
 */

/** Progress over the whole batch, 0..1, plus which file is in flight. */
export type UploadProgress = {
  /** 0..1 across every file in the batch. */
  ratio: number;
  /** 1-based, for "File 2 of 3". */
  index: number;
  total: number;
  /** The file currently being sent. */
  name: string;
  /** True while a failed attempt is being retried. */
  retrying: boolean;
};

export type UploadProgressFn = (p: UploadProgress) => void;

/** Attempts per file (or per part). The first failure is usually the network. */
const MAX_ATTEMPTS = 3;

/** Matches the server's MULTIPART_THRESHOLD_BYTES. */
const MULTIPART_THRESHOLD = 8 * 1024 * 1024;

type PresignSingle = {
  mode: 'single';
  key: string;
  url: string;
};

type PresignMultipart = {
  mode: 'multipart';
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
};

type PresignEntry = PresignSingle | PresignMultipart;

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await AsyncStorage.getItem('access_token')) ?? '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { token } : {}),
    // Every authenticated mobile-app route checks the version header too.
    appversion: '1.0.0',
  };
}

/**
 * A failure the patient should actually be told about, in words.
 *
 * The server knows things the app cannot phrase as well — "prescription.pdf is
 * 62 MB. The limit is 50 MB." beats "Could not upload". Anything without a
 * message from the server stays a plain Error, so call sites can tell the
 * difference between "explain this" and "offer a retry".
 */
export class UploadError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string) {
    super(userMessage);
    this.name = 'UploadError';
    this.userMessage = userMessage;
  }
}

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.code !== 1) {
    if (json?.message) throw new UploadError(String(json.message));
    throw new Error(`HTTP ${res.status}`);
  }
  return json.data as T;
}

/** Sleeps between attempts, growing a little each time. */
const backoff = (attempt: number) =>
  new Promise((r) => setTimeout(r, 600 * attempt));

/**
 * The ETag S3 returns for a part, which the complete call needs.
 *
 * Header casing is not guaranteed across platforms, so both are checked rather
 * than assuming one. A part with no ETag cannot be completed, so this throws
 * rather than returning an empty string that would fail later and further away.
 */
function etagOf(headers: Record<string, string>): string {
  const tag = headers?.etag ?? headers?.ETag ?? headers?.Etag;
  if (!tag) throw new Error('S3 returned no ETag for a part');
  return String(tag);
}

/** Runs `fn`, retrying transient failures, reporting each retry. */
async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry: () => void
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        onRetry();
        await backoff(attempt);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('upload failed');
}

/**
 * Sends a whole file in one presigned PUT.
 *
 * `BINARY_CONTENT` rather than MULTIPART: a presigned PUT expects the raw
 * bytes as the body, and a multipart envelope would store the form boundary
 * inside the object.
 */
async function putWholeFile(
  file: File,
  entry: PresignSingle,
  mimeType: string,
  onBytes: (sent: number) => void
): Promise<void> {
  const res = await file.upload(entry.url, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': mimeType },
    onProgress: ({ bytesSent }) => onBytes(bytesSent),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`S3 refused the upload: HTTP ${res.status}`);
  }
}

/**
 * Sends one byte range as an S3 multipart part.
 *
 * The range has to be copied to a temporary file first. Nothing in the file
 * APIs uploads a slice of a file in place, so the bytes are read with a seeked
 * handle — not by loading the whole file — written to the cache directory, sent,
 * and deleted. The cache is the right home for them: if the app is killed
 * mid-upload the OS reclaims the leftovers.
 */
async function putPart(
  source: File,
  partUrl: string,
  start: number,
  length: number,
  onBytes: (sent: number) => void
): Promise<string> {
  const temp = new File(Paths.cache, `upload-part-${Date.now()}-${start}.bin`);
  const handle = source.open(FileMode.ReadOnly);
  try {
    handle.offset = start;
    const bytes = await handle.readBytes(length);
    handle.close();

    if (temp.exists) temp.delete();
    temp.create();
    await temp.write(bytes);

    const res = await temp.upload(partUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      onProgress: ({ bytesSent }) => onBytes(bytesSent),
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`S3 refused a part: HTTP ${res.status}`);
    }
    return etagOf(res.headers);
  } finally {
    // Always, including on failure: a 50 MB file leaves six 8 MB temporaries
    // behind otherwise, and the next attempt adds six more.
    try {
      handle.close();
    } catch {
      // Already closed on the success path.
    }
    try {
      if (temp.exists) temp.delete();
    } catch {
      // Cache cleanup is best-effort; the OS reclaims it.
    }
  }
}

/** Tells the server to drop an unfinished multipart upload. */
async function abort(key: string, uploadId: string): Promise<void> {
  try {
    await api('/upload/abort', { key, uploadId });
  } catch {
    // Best-effort. The server logs it; the patient must not see it.
  }
}

/**
 * Uploads patient files and returns their storage keys, in order.
 *
 * `onProgress` is called with the batch's overall ratio, so a caller can show
 * one bar for "attaching 3 files" rather than three bars the patient has to
 * add up.
 */
export async function uploadFiles(
  files: PickedFile[],
  purpose: UploadPurpose,
  onProgress?: UploadProgressFn
): Promise<string[]> {
  if (files.length === 0) return [];

  const totalBytes = files.reduce((sum, f) => sum + Math.max(0, f.size), 0);
  /** Bytes confirmed sent for FILES ALREADY FINISHED. */
  let doneBytes = 0;

  const report = (
    index: number,
    name: string,
    sentForCurrent: number,
    retrying = false
  ) => {
    if (!onProgress) return;
    const sent = doneBytes + sentForCurrent;
    onProgress({
      // Guarded: a picker can report size 0 (some Android content providers
      // do), and dividing by zero would make the bar NaN rather than full.
      ratio: totalBytes > 0 ? Math.min(1, sent / totalBytes) : 0,
      index: index + 1,
      total: files.length,
      name,
      retrying,
    });
  };

  const presigned = await api<{ files: PresignEntry[] }>('/upload/presign', {
    purpose,
    files: files.map((f) => ({ name: f.name, type: f.mimeType, size: f.size })),
  });

  const entries = presigned.files ?? [];
  if (entries.length !== files.length) {
    throw new Error('upload could not be prepared');
  }

  const keys: string[] = [];

  for (let i = 0; i < files.length; i += 1) {
    const picked = files[i];
    const entry = entries[i];
    const source = new File(picked.uri);

    report(i, picked.name, 0);

    if (entry.mode === 'single') {
      await withRetry(
        () =>
          putWholeFile(source, entry, picked.mimeType, (sent) =>
            report(i, picked.name, sent)
          ),
        () => report(i, picked.name, 0, true)
      );
    } else {
      const { partSize, parts, key, uploadId } = entry;
      const done: { partNumber: number; eTag: string }[] = [];
      /** Bytes from parts of THIS file that have already finished. */
      let partsDoneBytes = 0;

      try {
        for (const part of parts) {
          const start = (part.partNumber - 1) * partSize;
          const length = Math.min(partSize, picked.size - start);
          const eTag = await withRetry(
            () =>
              putPart(source, part.url, start, length, (sent) =>
                report(i, picked.name, partsDoneBytes + sent)
              ),
            () => report(i, picked.name, partsDoneBytes, true)
          );
          done.push({ partNumber: part.partNumber, eTag });
          partsDoneBytes += length;
        }
      } catch (err) {
        // Abort before giving up, or S3 bills for the parts already stored
        // against an upload that will never be completed.
        await abort(key, uploadId);
        throw err;
      }

      // Hand the parts to the server, which completes the upload and checks
      // the finished object really exists.
      const finished = await api<{ key: string }>('/upload/complete', {
        key,
        uploadId,
        parts: done,
      });
      keys.push(finished.key);
      doneBytes += picked.size;
      continue;
    }

    // Single-PUT files confirm through the same endpoint, so there is one place
    // that decides a key is safe to attach.
    const finished = await api<{ key: string }>('/upload/complete', {
      key: entry.key,
    });
    keys.push(finished.key);
    doneBytes += picked.size;
  }

  if (keys.length !== files.length) {
    // A partial upload would attach some files to a request and silently drop
    // others, which Ops would read as "the patient only sent one page".
    throw new Error('upload incomplete');
  }
  return keys;
}

/**
 * True for a file big enough that the UI should show a percentage.
 *
 * Exported so a screen can decide between "Uploading…" and a progress bar
 * without repeating the threshold.
 */
export const isLargeUpload = (files: PickedFile[]): boolean =>
  files.some((f) => f.size > MULTIPART_THRESHOLD);

/**
 * Exchanges a stored key for a short-lived URL the app can render.
 * Presigned rather than public, for the reason in the note at the top.
 */
export async function getFileUrl(key: string): Promise<string | null> {
  const token = (await AsyncStorage.getItem('access_token')) ?? '';
  const res = await fetch(
    `${BASE_URL}/upload/url?key=${encodeURIComponent(key)}`,
    { headers: token ? { token } : {} }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.url ?? null;
}
