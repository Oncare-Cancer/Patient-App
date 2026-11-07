import { useCallback, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import type { UploadProgress } from '@/services/upload';

/**
 * Turns upload progress into one label a button or a row can show.
 *
 * WHY A HOOK AND NOT A COMPONENT
 * Three places upload: the two prescription-reading screens and the shared
 * request submit. All three already have a button with a `loading` state, so
 * the right loader is that button saying what is happening rather than a new
 * overlay on top of a form the patient is still looking at.
 *
 * The percentage matters because the limit is now 50 MB. A file that size on a
 * hospital connection takes long enough that a spinner with no number is
 * indistinguishable from a hang, and the patient's next move is to press the
 * button again.
 */
export function useUploadProgress() {
  const t = useT();
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const onProgress = useCallback((next: UploadProgress) => {
    setProgress(next);
  }, []);

  const reset = useCallback(() => setProgress(null), []);

  /** Null when nothing is uploading, so callers can fall back to their own label. */
  const label =
    progress === null
      ? null
      : progress.retrying
      ? t('ui.upload.uploadRetrying')
      : progress.total > 1
      ? t('ui.upload.uploadingOf', {
          index: progress.index,
          total: progress.total,
          // Floored, not rounded: showing 100% while bytes are still moving is
          // the one number a progress label must never show.
          percent: Math.floor(progress.ratio * 100),
        })
      : t('ui.upload.uploadingPct', {
          percent: Math.floor(progress.ratio * 100),
        });

  return { onProgress, label, reset, progress };
}
