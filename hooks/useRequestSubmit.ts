import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import {
  createGuestRequest,
  createRequest,
  requestErrorMessage,
  type GuestRequestType,
  type RequestLine,
  type RequestType,
} from '@/services/requests';
import {
  isLargeUpload,
  uploadFiles,
  UploadError,
  type UploadPurpose,
} from '@/services/upload';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import type { PickedFile } from '@/components/ui/UploadField';
import { toastError, toastSuccess } from '@/utils/toast';

/** Everything a request carries apart from who it is for and its files. */
type RequestBody = {
  subType?: string;
  centre?: string;
  address?: string;
  pincode?: string;
  preferredDate?: string;
  preferredSlot?: string;
  note?: string;
  lines?: RequestLine[];
  meta?: Record<string, unknown>;
};

/**
 * Submits a service request, as either a signed-in patient or a guest.
 *
 * The branch lives here rather than in each screen because there are four of
 * them — medicines, lab tests, admission, second opinion — and the difference
 * is small but easy to get subtly wrong in one place:
 *
 *   signed in  -> upload any attachments, then POST /requests; the name and
 *                 number come from the session
 *   guest      -> open a sheet for a name and number, then POST
 *                 /requests/guest; NO attachments, because an upload key is
 *                 scoped to a patient id and there is no patient
 *
 * Both paths end on the same confirmation screen with the same request id, so
 * a guest is not treated as a second-class case once the request is in.
 */
export function useRequestSubmit({
  type,
  files = [],
  uploadPurpose = 'document',
  build,
  summary,
  onSubmitted,
  canSubmit = true,
}: {
  type: RequestType;
  /** Attachments, for the signed-in path only. */
  files?: PickedFile[];
  uploadPurpose?: UploadPurpose;
  /** Built at submit time, so it always reflects the current screen state. */
  build: () => RequestBody;
  /** One line shown in the guest sheet, e.g. "4 medicines". */
  summary?: string;
  onSubmitted: (result: { requestId: string; phone: string }) => void;
  /** The screen's own validity check. */
  canSubmit?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { isAuthenticated, patient } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const upload = useUploadProgress();

  // Mirrors GUEST_TYPES on the server. Home care joined in round 7: it is a
  // Home tile like the others, and the team confirms the visit on the call.
  const GUEST_TYPES: RequestType[] = [
    'medicine',
    'lab',
    'admission',
    'secondOpinion',
    'homeCare',
    'consultation',
  ];
  const guestAllowed = GUEST_TYPES.includes(type);

  const asPatient = useCallback(async () => {
    setSubmitting(true);
    try {
      const fileKeys = files.length
        ? await uploadFiles(files, uploadPurpose, upload.onProgress)
        : [];
      // Only when the patient actually waited. A 400 KB photo finishes before
      // the toast could be read, and confirming something instant is noise.
      if (files.length && isLargeUpload(files)) {
        toastSuccess(t('ui.upload.uploadDone'));
      }
      upload.reset();
      const { requestId } = await createRequest({ type, ...build(), fileKeys });
      onSubmitted({ requestId, phone: patient?.phone_number ?? '' });
    } catch (err) {
      upload.reset();
      // The server's wording when it has one — "that file is 62 MB, over the
      // 50 MB limit" tells the patient what to do; "something went wrong"
      // leaves them pressing the same button.
      if (err instanceof UploadError) {
        toastError(t('ui.upload.uploadFailed'), err.userMessage);
      } else {
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [files, uploadPurpose, type, build, onSubmitted, patient, t, upload]);

  const asGuest = useCallback(
    async ({ name, phone, countryCode }: { name: string; phone: string; countryCode: string }) => {
      setSubmitting(true);
      try {
        const { requestId } = await createGuestRequest({
          type: type as GuestRequestType,
          name,
          phone,
          countryCode,
          ...build(),
        });
        setGuestOpen(false);
        onSubmitted({ requestId, phone: countryCode === '91' ? phone : `+${countryCode} ${phone}` });
      } catch (err) {
        // The server's own sentence when it has one ("Please add the address
        // for the visit"), so the guest knows what to fix.
        toastError(
          t('ui.common.somethingWrong'),
          requestErrorMessage(err) ?? t('ui.common.retry')
        );
      } finally {
        setSubmitting(false);
      }
    },
    [type, build, onSubmitted, t]
  );

  const submit = useCallback(() => {
    if (submitting || !canSubmit) return;
    if (isAuthenticated) {
      void asPatient();
      return;
    }
    if (guestAllowed) {
      setGuestOpen(true);
      return;
    }
    // Nothing a guest can do with this type, so send them to login rather
    // than opening a sheet that cannot succeed.
    router.push('/login');
  }, [submitting, canSubmit, isAuthenticated, guestAllowed, asPatient, router]);

  return {
    submit,
    submitting,
    /**
     * "File 2 of 3 · 47%" while attachments are going up, else null.
     *
     * Screens put this on the submit button in place of their own label: the
     * button is already the thing the patient is watching, and a 50 MB upload
     * behind a label that just says "Submit" looks stuck.
     */
    uploadLabel: upload.label,
    /** True when the screen should hide anything that needs a session. */
    isGuest: !isAuthenticated,
    /** Spread onto <GuestDetailsSheet />. */
    guestSheet: {
      visible: guestOpen,
      submitting,
      summary,
      onClose: () => setGuestOpen(false),
      onSubmit: asGuest,
      onLogin: () => {
        setGuestOpen(false);
        router.push('/login');
      },
    },
  };
}
