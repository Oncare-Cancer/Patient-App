import { BASE_URL } from '@/utils/fetchWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedFile } from '@/components/ui/UploadField';

export type UploadPurpose = 'prescription' | 'report' | 'document';

/**
 * Uploads patient files and returns their storage keys.
 *
 * Multipart, so it bypasses fetchWrapper — that helper sets a JSON content type
 * and stringifies the body, both of which break a file upload.
 *
 * Files land under the private `patient-docs/` prefix, NOT under `img/`. The
 * existing `img/patient/documents/...` path is served publicly by CloudFront
 * with no authentication — a prescription URL returns 200 to anyone who has it —
 * so new uploads go somewhere that is not publicly routed and are read back
 * through short-lived presigned URLs.
 */
export async function uploadFiles(
  files: PickedFile[],
  purpose: UploadPurpose
): Promise<string[]> {
  if (files.length === 0) return [];

  const token = (await AsyncStorage.getItem('access_token')) ?? '';
  const form = new FormData();
  form.append('purpose', purpose);

  files.forEach((f) => {
    // React Native's FormData takes this shape rather than a Blob.
    form.append('files', {
      uri: f.uri,
      name: f.name,
      type: f.mimeType,
    } as unknown as Blob);
  });

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      // Content-Type is deliberately unset: fetch has to add the multipart
      // boundary itself, and setting it by hand produces a request the server
      // cannot parse.
      ...(token ? { token } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`upload failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  const keys: string[] = json?.data?.keys ?? [];
  if (keys.length !== files.length) {
    // A partial upload would attach some files to a request and silently drop
    // others, which Ops would read as "the patient only sent one page".
    throw new Error('upload incomplete');
  }
  return keys;
}

/**
 * Exchanges a stored key for a short-lived URL the app can render.
 * Presigned rather than public, for the reason in the note above.
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
