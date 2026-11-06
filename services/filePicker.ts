import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { UPLOAD_LIMITS, type PickedFile } from '@/components/ui/UploadField';

/**
 * Prescription and report picking.
 *
 * Section 13's rules table: "Camera / gallery / PDF / from Records · up to 3
 * files · 10 MB each". Camera and gallery go through expo-image-picker, PDFs
 * through expo-document-picker, and "from Records" is a different thing
 * entirely — it reuses a document the patient already has, so it is handled by
 * the Records picker rather than here.
 *
 * Validation lives in one place because the same limits are quoted on five
 * screens (E2, F1, G1, H1, H2) and the backend has to agree with all of them.
 */

export type PickResult =
  | { ok: true; files: PickedFile[] }
  | { ok: false; reason: 'cancelled' | 'permission' | 'tooLarge' | 'tooMany' | 'badType' };

function withinLimits(
  files: PickedFile[],
  existingCount: number
): PickResult {
  if (existingCount + files.length > UPLOAD_LIMITS.maxFiles) {
    return { ok: false, reason: 'tooMany' };
  }
  if (files.some((f) => f.size > UPLOAD_LIMITS.maxBytes)) {
    return { ok: false, reason: 'tooLarge' };
  }
  if (
    files.some(
      (f) => !UPLOAD_LIMITS.mimeTypes.includes(f.mimeType as never)
    )
  ) {
    return { ok: false, reason: 'badType' };
  }
  return { ok: true, files };
}

/** Camera. Asks for permission on first use and reports a refusal distinctly. */
export async function pickFromCamera(existingCount: number): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };

  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    // A prescription photo is read by a model and a pharmacist, so it is
    // compressed lightly rather than aggressively — legibility matters more
    // than upload size here.
    quality: 0.85,
    exif: false,
  });
  if (res.canceled || !res.assets?.length) return { ok: false, reason: 'cancelled' };

  return withinLimits(
    res.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `prescription-${Date.now()}-${i}.jpg`,
      size: a.fileSize ?? 0,
      mimeType: a.mimeType ?? 'image/jpeg',
    })),
    existingCount
  );
}

/** Photo library. Allows multi-select up to whatever budget is left. */
export async function pickFromGallery(existingCount: number): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };

  const remaining = UPLOAD_LIMITS.maxFiles - existingCount;
  if (remaining <= 0) return { ok: false, reason: 'tooMany' };

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.85,
    exif: false,
  });
  if (res.canceled || !res.assets?.length) return { ok: false, reason: 'cancelled' };

  return withinLimits(
    res.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `prescription-${Date.now()}-${i}.jpg`,
      size: a.fileSize ?? 0,
      mimeType: a.mimeType ?? 'image/jpeg',
    })),
    existingCount
  );
}

/** PDF. Also accepts images, since a file manager mixes them freely. */
export async function pickDocument(existingCount: number): Promise<PickResult> {
  const remaining = UPLOAD_LIMITS.maxFiles - existingCount;
  if (remaining <= 0) return { ok: false, reason: 'tooMany' };

  const res = await DocumentPicker.getDocumentAsync({
    type: [...UPLOAD_LIMITS.mimeTypes],
    multiple: true,
    // Without this the picked uri can disappear before upload on Android.
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return { ok: false, reason: 'cancelled' };

  return withinLimits(
    res.assets.slice(0, remaining).map((a) => ({
      uri: a.uri,
      name: a.name,
      size: a.size ?? 0,
      mimeType: a.mimeType ?? 'application/pdf',
    })),
    existingCount
  );
}

/** Human-readable reason, for a toast. */
export function pickErrorKey(
  reason: Exclude<PickResult, { ok: true }>['reason']
): string {
  switch (reason) {
    case 'tooMany':
      return 'ui.upload.tooMany';
    case 'tooLarge':
      return 'ui.upload.tooLarge';
    case 'badType':
      return 'ui.upload.badType';
    case 'permission':
      return 'ui.upload.permission';
    default:
      return 'ui.common.somethingWrong';
  }
}
