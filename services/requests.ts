import { fetchWrapper } from '@/utils/fetchWrapper';
import { getApproxLocation, type ApproxLocation } from '@/services/location';
import { guestDeviceKey, rememberGuestContact } from '@/services/guestIdentity';

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

export type RequestType =
  | 'homeCare'
  | 'medicine'
  | 'lab'
  | 'secondOpinion'
  | 'admission'
  | 'callBack'
  | 'consultation';

/** Where in the app a request was raised. Shown to the team as "From". */
export type RequestOrigin = {
  type: 'blog' | 'video' | 'centre' | 'doctor' | 'home' | 'booking' | 'service';
  slug?: string;
  title?: string;
};

/**
 * The patient's approximate location, for the request body.
 *
 * Every request carries one when the patient has allowed it, so the team sees
 * "3 km from Gurugram" and routes the call to the right desk. It asks the OS
 * only while the permission is undetermined - after a "no" it never asks
 * again - and gives up after 4 s, so a slow fix can never hold up a submit.
 */
/**
 * The server's own sentence from a failed request, when it sent one.
 *
 * fetchWrapper throws "HTTP 400: {json}" for a 4xx, and the JSON carries a
 * message written for the patient ("Please choose a centre and a preferred
 * day"). Showing that beats a generic "something went wrong", which leaves
 * them pressing the same button.
 */
export function requestErrorMessage(err: unknown): string | null {
  const m = /^HTTP 4\d\d: ([\s\S]*)$/.exec(String((err as Error)?.message ?? ''));
  if (!m) return null;
  try {
    const msg = JSON.parse(m[1])?.message;
    return typeof msg === 'string' && msg.trim() ? msg : null;
  } catch {
    return null;
  }
}

async function locationField(): Promise<{ location?: ApproxLocation }> {
  const location = await getApproxLocation({ timeoutMs: 4000 });
  return location ? { location } : {};
}

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
  /** Digits only, without "+". Defaults to 91 server-side. */
  countryCode?: string;
  callingFor: 'myself' | 'family';
  topic: string;
  city?: string;
  /** The patient's question, from "Any query" on a blog or video. */
  note?: string;
  origin?: RequestOrigin;
}): Promise<{ requestId: string }> {
  const res = await fetchWrapper<any>('/requests/call-back', {
    method: 'POST',
    // The device key lets this phone list the request in My Care later.
    body: { ...body, ...(await locationField()), guestKey: await guestDeviceKey() },
    skipAuth: true,
  });
  await rememberGuestContact({ name: body.name, phone: body.mobile, countryCode: body.countryCode ?? '91' });
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
  origin?: RequestOrigin;
}): Promise<{ requestId: string }> {
  const res = await fetchWrapper<any>('/requests', {
    method: 'POST',
    body: { ...body, ...(await locationField()) },
  });
  return { requestId: res?.data?.requestId ?? '' };
}

/**
 * The service requests a guest can raise without logging in.
 *
 * `consultation` is a guest's booking: a doctor, a centre and a preferred day
 * and time, and the team calls back. A logged-in patient books a real slot.
 */
export type GuestRequestType =
  | 'medicine'
  | 'lab'
  | 'admission'
  | 'secondOpinion'
  | 'consultation'
  | 'homeCare';

/**
 * The same request, raised without a session.
 *
 * A guest can browse and build the whole thing; the name and number are asked
 * for once, at the point of submit, because that is the only information the
 * team actually needs in order to call back.
 *
 * Two deliberate differences from `createRequest`:
 *  - `name` and `phone` are required, since there is no token to derive them
 *    from;
 *  - no `fileKeys`. Uploading needs a session (the storage key is scoped to a
 *    patient id), so the guest screens do not offer attachments at all rather
 *    than offering them and failing.
 *
 * A guest can list these later only from the same device: the read needs the
 * number AND this device's random key (services/guestIdentity.ts), because a
 * phone number alone is not a credential.
 */
export async function createGuestRequest(body: {
  type: GuestRequestType;
  name: string;
  phone: string;
  /** Digits only, without "+". Defaults to 91 server-side. */
  countryCode?: string;
  subType?: string;
  centre?: string;
  address?: string;
  pincode?: string;
  preferredDate?: string;
  preferredSlot?: string;
  note?: string;
  lines?: RequestLine[];
  meta?: Record<string, unknown>;
  origin?: RequestOrigin;
}): Promise<{ requestId: string }> {
  const res = await fetchWrapper<any>('/requests/guest', {
    method: 'POST',
    // The device key lets this phone list the request in My Care later.
    body: { ...body, ...(await locationField()), guestKey: await guestDeviceKey() },
    skipAuth: true,
  });
  await rememberGuestContact({ name: body.name, phone: body.phone, countryCode: body.countryCode ?? '91' });
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
