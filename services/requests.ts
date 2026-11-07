import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * Ops requests — the tickets behind sections 12 to 17.
 *
 * Every service request in the redesign lands in one collection with one status
 * workflow, so the Ops Dashboard has a single queue to work and the patient has
 * a single timeline to read. The type decides the prefix on the request id:
 *
 *   HC-…  Home Care          MD-…  Medicine order
 *   LB-…  Lab tests          SO-…  Second Opinion
 *   AD-…  Admission          CB-…  Guest call back
 *
 * The status ladder is shared by all of them (section 17):
 *   Submitted -> Called -> Scheduled | Price shared -> In progress -> Completed
 *   (or Closed with a reason)
 */

export type RequestType = 'homeCare' | 'medicine' | 'lab' | 'secondOpinion' | 'admission' | 'callBack';

export type RequestStatus =
  | 'submitted'
  | 'called'
  | 'scheduled'
  | 'priceShared'
  | 'inProgress'
  | 'completed'
  | 'closed';

/**
 * How a catalogue lookup turned out for one line of a request.
 *
 * Nothing here blocks submission. `CA 15-3` — a test the design itself shows on
 * screen G1 — has zero rows in the catalogue, and roughly half of lab items have
 * no price, so "we could not match this" has to be a normal outcome rather than
 * an error. Ops prices the flagged lines; the patient is not asked to care.
 */
export type MatchStatus =
  /** One confident hit and the strength agrees. */
  | 'matched'
  /** Several brands of the same drug and strength — Ops picks one. */
  | 'ambiguous'
  /** Drug found but not at the strength written — Ops confirms the dose. */
  | 'strengthMismatch'
  /** Catalogue hit with no usable price — Ops prices it. */
  | 'unpriced'
  /** Nothing found — Ops sources and prices it. */
  | 'unmatched';

export type RequestLine = {
  /** Verbatim from the prescription or the patient's search. */
  name: string;
  strength?: string;
  quantity?: number;
  /** Catalogue id when something matched. */
  catalogId?: string;
  matchStatus: MatchStatus;
  /** Approximate price, null whenever matchStatus is not `matched`. */
  approxPrice?: number | null;
  /** Set when the line came from a prescription rather than a search. */
  fromPrescription?: boolean;
};

export type TimelineEntry = {
  status: RequestStatus;
  at: string;
  note?: string;
};

export type OpsRequest = {
  id: string;
  /** Human-facing id, e.g. "HC-10423". */
  requestId: string;
  type: RequestType;
  subType?: string;
  status: RequestStatus;
  createdAt: string;
  centre?: string;
  preferredDate?: string;
  preferredSlot?: string;
  lines?: RequestLine[];
  timeline: TimelineEntry[];
  /** Set once Ops shares a price the patient has to confirm. */
  quotedTotal?: number | null;
};

/* ------------------------------------------------------------------- guest */

/**
 * B4. Raises a lead with source "App – Guest" — no session required, which is
 * why this is the only request helper that skips auth.
 */
export async function requestCallBack(body: {
  name: string;
  mobile: string;
  callingFor: 'myself' | 'family';
  topic: string;
  city: string;
}): Promise<{ requestId: string }> {
  const res = await fetchWrapper<any>('/requests/call-back', {
    method: 'POST',
    body,
    skipAuth: true,
  });
  return { requestId: res?.data?.requestId ?? '' };
}

/* --------------------------------------------------------------- patient */

export async function createRequest(body: {
  type: RequestType;
  subType?: string;
  centre?: string;
  address?: string;
  pincode?: string;
  preferredDate?: string;
  preferredSlot?: string;
  note?: string;
  lines?: RequestLine[];
  /** Keys of files already uploaded via services/upload. */
  fileKeys?: string[];
  /** Free-form extras per type (cancer type, payment mode, delivery mode…). */
  meta?: Record<string, unknown>;
}): Promise<{ requestId: string }> {
  const res = await fetchWrapper<any>('/requests', {
    method: 'POST',
    body,
  });
  return { requestId: res?.data?.requestId ?? '' };
}

/**
 * Saves the cart without submitting it.
 *
 * This is what lets the central team see a cart a patient filled and walked
 * away from, so they can call and finish the order. One draft per patient per
 * type is kept server-side, so calling this repeatedly as the cart changes
 * updates a single row rather than leaving a trail.
 *
 * Deliberately fire-and-forget: a failed draft save must never interrupt the
 * patient. Sending an empty `lines` clears the draft.
 */
export async function saveRequestDraft(body: {
  type: RequestType;
  lines: RequestLine[];
  note?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetchWrapper('/requests/draft', { method: 'POST', body });
  } catch {
    // Swallowed on purpose — see above.
  }
}

/** H3 — the Requests view in Activity. */
export async function listRequests(): Promise<OpsRequest[]> {
  const res = await fetchWrapper<any>('/requests');
  return res?.data ?? [];
}

export async function getRequest(requestId: string): Promise<OpsRequest | null> {
  const res = await fetchWrapper<any>(
    `/requests/${encodeURIComponent(requestId)}`
  );
  return res?.data ?? null;
}

/** Patient accepts the price Ops shared (the "Confirm price" action on H3). */
export async function confirmRequestPrice(requestId: string): Promise<void> {
  await fetchWrapper(`/requests/${encodeURIComponent(requestId)}/confirm`, {
    method: 'POST',
  });
}
