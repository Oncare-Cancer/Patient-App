import { useCallback, useState } from 'react';
import type { PickedFile } from '@/components/ui/UploadField';
import {
  pickFromCamera,
  pickFromGallery,
  pickDocument,
  pickErrorKey,
} from '@/services/filePicker';
import { useT } from '@/contexts/LanguageContext';
import { toastError } from '@/utils/toast';

/**
 * Attachment state plus the three pickers, shared by every screen that takes a
 * prescription or a report (E2, F1, G1, H1, H2).
 *
 * Each screen otherwise reimplements the same limit checks and the same error
 * toasts, and they drift. Here the limits are enforced once in
 * services/filePicker and the failure is reported the same way everywhere.
 */
export function useAttachments(initial: PickedFile[] = []) {
  const t = useT();
  const [files, setFiles] = useState<PickedFile[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  const run = useCallback(
    async (picker: (count: number) => ReturnType<typeof pickDocument>) => {
      const res = await picker(files.length);
      if (res.ok) {
        setFiles((prev) => [...prev, ...res.files]);
        return;
      }
      // A cancel is not a failure and must not raise a toast.
      if (res.reason === 'cancelled') return;
      toastError(t(pickErrorKey(res.reason) as never));
    },
    [files.length, t]
  );

  return {
    files,
    setFiles,
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    remove: (index: number) =>
      setFiles((prev) => prev.filter((_, i) => i !== index)),
    fromCamera: () => void run(pickFromCamera),
    fromGallery: () => void run(pickFromGallery),
    fromDocument: () => void run(pickDocument),
  };
}
