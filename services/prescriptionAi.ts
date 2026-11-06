import { fetchWrapper } from '@/utils/fetchWrapper';
import type { RequestLine } from '@/services/requests';

/**
 * Reads an uploaded prescription and returns the lines it found, already matched
 * against the catalogue.
 *
 * The model runs server-side (Claude Haiku 4.5 on Bedrock, India-only inference
 * profile) and the matching happens in the same call, so the app never sees raw
 * model output and cannot be the thing that decides what a drug name means.
 *
 * Three properties of this contract matter:
 *
 *  - `lines` can be empty. An unreadable photo is a normal outcome, and the
 *    screens fall back to "search & add" rather than dead-ending.
 *  - every line carries a `matchStatus`, and anything other than `matched`
 *    still goes into the cart. `CA 15-3` — a test printed on the design's own
 *    lab screen — has no catalogue row at all.
 *  - `confidence` is the model's own assessment. On a degraded photo it
 *    correctly reported `low` while misreading a chemotherapy drug by one
 *    letter, which is why the UI shows the "please check" banner on anything
 *    below `high` and a pharmacist confirms regardless.
 */

export type PrescriptionRead = {
  /** Medicines for F2, tests for G2 — the caller asks for one or the other. */
  lines: RequestLine[];
  confidence: 'high' | 'medium' | 'low';
  legible: 'printed' | 'handwritten_clear' | 'handwritten_poor';
  /** Doctor and date, when the model could read them. */
  doctor?: string;
  date?: string;
};

export async function readPrescription(params: {
  /** Storage keys returned by services/upload. */
  fileKeys: string[];
  /** Which half of the prescription to extract. */
  want: 'medicines' | 'labTests';
}): Promise<PrescriptionRead> {
  const res = await fetchWrapper<any>('/prescription/read', {
    method: 'POST',
    body: params,
  });

  return {
    lines: res?.data?.lines ?? [],
    confidence: res?.data?.confidence ?? 'low',
    legible: res?.data?.legible ?? 'handwritten_poor',
    doctor: res?.data?.doctor ?? undefined,
    date: res?.data?.date ?? undefined,
  };
}

/** True when the UI should push the patient harder to check the result. */
export function needsCarefulCheck(read: PrescriptionRead): boolean {
  return read.confidence !== 'high' || read.legible === 'handwritten_poor';
}
