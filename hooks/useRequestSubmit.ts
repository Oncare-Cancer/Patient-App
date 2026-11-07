import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import {
  createGuestRequest,
  createRequest,
  type GuestRequestType,
  type RequestLine,
  type RequestType,
} from '@/services/requests';
import { uploadFiles, type UploadPurpose } from '@/services/upload';
import type { PickedFile } from '@/components/ui/UploadField';
import { toastError } from '@/utils/toast';

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

  const GUEST_TYPES: RequestType[] = ['medicine', 'lab', 'admission', 'secondOpinion'];
  const guestAllowed = GUEST_TYPES.includes(type);

  const asPatient = useCallback(async () => {
    setSubmitting(true);
    try {
      const fileKeys = files.length
        ? await uploadFiles(files, uploadPurpose)
        : [];
      const { requestId } = await createRequest({ type, ...build(), fileKeys });
      onSubmitted({ requestId, phone: patient?.phone_number ?? '' });
    } catch {
      toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
    } finally {
      setSubmitting(false);
    }
  }, [files, uploadPurpose, type, build, onSubmitted, patient, t]);

  const asGuest = useCallback(
    async ({ name, phone }: { name: string; phone: string }) => {
      setSubmitting(true);
      try {
        const { requestId } = await createGuestRequest({
          type: type as GuestRequestType,
          name,
          phone,
          ...build(),
        });
        setGuestOpen(false);
        onSubmitted({ requestId, phone });
      } catch {
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
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
    router.replace('/login');
  }, [submitting, canSubmit, isAuthenticated, guestAllowed, asPatient, router]);

  return {
    submit,
    submitting,
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
        router.replace('/login');
      },
    },
  };
}
