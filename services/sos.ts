import { fetchWrapper } from '@/utils/fetchWrapper';

export type SosOption = 'centre' | 'home' | 'emergency-112';

/**
 * Records an SOS tap for the Ops Dashboard (section 11: "Every SOS tap is logged
 * on the Ops Dashboard with patient, time and option chosen").
 *
 * Deliberately fire-and-forget and never throws. The caller dials immediately
 * after calling this; a slow or failed log must not delay a patient in an
 * emergency, and there is nothing useful to tell them about it either.
 *
 * Works without login — the backend attaches the patient when a token is
 * present and files it as a guest SOS when it is not.
 */
export function logSosTap(option: SosOption): void {
  void fetchWrapper('/sos-log', {
    method: 'POST',
    body: { option, at: new Date().toISOString() },
  }).catch(() => {
    /* intentionally ignored — see above */
  });
}
