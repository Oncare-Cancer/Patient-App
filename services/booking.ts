import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * Appointment booking.
 *
 * Every call and payload is unchanged from the previous Book screen, so the
 * rebuild cannot alter what reaches Docpulse:
 *
 *   GET  locations
 *   POST practitioners      { locationId }
 *   POST visit-types        { locationId, practitionerId }
 *   POST visit-slots        { locationId, practitionerId, visitTypeName, date }
 *   POST create-appointment { practitionerId, locationId, dateTime, visitTypeName }
 *
 * What the redesign adds on top is derived here rather than requested, because
 * the API offers no endpoint for it: the next free slot per doctor (section 07
 * wants it on the doctor card) is found by probing the slot list, and city
 * grouping comes from the location name.
 */

export type Location = {
  id: string;
  name: string;
  /** Everything the API returned, so screens can read fields we have not typed. */
  [key: string]: unknown;
};

export type Practitioner = {
  id: string;
  name: string;
  speciality?: string;
  [key: string]: unknown;
};

export type VisitType = string;

export type BookingSlot = {
  dateTime: string;
  [key: string]: unknown;
};

async function get<T>(path: string): Promise<T> {
  const data = await fetchWrapper<any>(`/${path}`);
  if (data.code !== 1) throw new Error(data.message ?? 'Request failed');
  return data.data as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const data = await fetchWrapper<any>(`/${path}`, { method: 'POST', body });
  if (data.code !== 1) throw new Error(data.message ?? 'Request failed');
  return data.data as T;
}

/** Two retries, 800 ms apart — kept from the original. */
async function retry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 800));
    return retry(fn, retries - 1);
  }
}

export const getLocations = () => get<Location[]>('locations');

export const getPractitioners = (locationId: string) =>
  post<Practitioner[]>('practitioners', { locationId });

export const getVisitTypes = (locationId: string, practitionerId: string) =>
  post<VisitType[]>('visit-types', { locationId, practitionerId });

export const getBookingSlots = (params: {
  locationId: string;
  practitionerId: string;
  visitTypeName: string;
  date: Date;
}) =>
  post<BookingSlot[]>('visit-slots', {
    locationId: params.locationId,
    practitionerId: params.practitionerId,
    visitTypeName: params.visitTypeName,
    date: params.date.toISOString().split('T')[0],
  });

export const createAppointment = (params: {
  practitionerId: string;
  locationId: string;
  dateTime: string;
  visitTypeName: string;
}) => retry(() => post<any>('create-appointment', params));

/* ------------------------------------------------------------------- derived */

/**
 * City grouping for C1's tabs.
 *
 * Derived from the location name because the Docpulse payload carries no city
 * field. Bengaluru centres are matched on their area names, which is brittle —
 * the real fix is the backend centre master, and PDF issue #6 flags the centre
 * list as unconfirmed anyway.
 */
const BENGALURU_HINTS = [
  'bengaluru',
  'bangalore',
  'jp nagar',
  'basavanagudi',
  'rajajinagar',
  'kamala nagar',
  'whitefield',
  'varthur',
  'kalyan nagar',
  'mathru',
];

export function cityOf(location: Location): 'Delhi NCR' | 'Bengaluru' {
  const name = `${location.name ?? ''} ${location.address ?? ''}`.toLowerCase();
  return BENGALURU_HINTS.some((h) => name.includes(h)) ? 'Bengaluru' : 'Delhi NCR';
}

export function groupByCity(
  locations: Location[]
): { city: string; items: Location[] }[] {
  const buckets = new Map<string, Location[]>();
  // Delhi NCR first, matching the design's tab order.
  for (const city of ['Delhi NCR', 'Bengaluru']) buckets.set(city, []);
  for (const l of locations) buckets.get(cityOf(l))!.push(l);
  return Array.from(buckets, ([city, items]) => ({ city, items })).filter(
    (g) => g.items.length > 0
  );
}

/**
 * Finds the earliest free slot for a doctor within the next `days`.
 *
 * Section 07's complaint was that "Doctor cards show no next available slot; so
 * patients have to tap through". There is no endpoint for this, so it probes
 * `visit-slots` day by day and stops at the first hit.
 *
 * Capped at 7 days and run per doctor only when the list is small, because this
 * is N requests per doctor in the worst case. Callers should treat a null as
 * "unknown", not "none".
 */
export async function findNextFreeSlot(params: {
  locationId: string;
  practitionerId: string;
  visitTypeName: string;
  days?: number;
}): Promise<{ dateTime: string; label: string } | null> {
  const days = params.days ?? 7;

  for (let i = 0; i < days; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    try {
      const slots = await getBookingSlots({ ...params, date });
      const free = slots.find((s) => !isTaken(s));
      if (free) {
        const when = new Date(free.dateTime);
        const dayLabel =
          i === 0
            ? 'Today'
            : i === 1
            ? 'Tomorrow'
            : when.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
        const time = when.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return { dateTime: free.dateTime, label: `${dayLabel} ${time}` };
      }
    } catch {
      // A failed day is not a failed search — keep probing.
    }
  }
  return null;
}

/**
 * Whether a slot is already booked.
 *
 * Issue #11: booked slots were not marked unavailable. The payload is not
 * documented, so every flag the API has been seen to use is checked, and an
 * unknown shape is treated as free rather than silently hiding a bookable slot.
 */
export function isTaken(slot: BookingSlot): boolean {
  const s = slot as Record<string, unknown>;
  return (
    s.isBooked === true ||
    s.booked === true ||
    s.available === false ||
    s.isAvailable === false ||
    s.status === 'booked'
  );
}

export type SlotBand = 'morning' | 'afternoon' | 'evening';

export function bandOf(iso: string): SlotBand {
  const h = new Date(iso).getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function slotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Normalises a practitioner's id and name across payload shapes. */
export function practitionerOf(raw: any): Practitioner {
  return {
    ...raw,
    id: String(raw.id ?? raw.practitionerId ?? raw._id ?? ''),
    name: String(raw.name ?? raw.practitionerName ?? ''),
    speciality: raw.speciality ?? raw.department ?? raw.specialization,
  };
}

export function locationOf(raw: any): Location {
  return {
    ...raw,
    id: String(raw.id ?? raw.locationId ?? raw._id ?? ''),
    name: String(raw.name ?? raw.locationName ?? raw.alias ?? ''),
  };
}
