import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * Appointments: list, slots, reschedule, cancel.
 *
 * Every call and payload here is lifted unchanged from the previous Activity
 * screen, so rebuilding the UI cannot change booking behaviour. The three the
 * design still needs:
 *
 *   visit-slots            { locationId, practitionerId, visitTypeName, date }
 *   reschedule-appointment { appointmentId, locationId, dateTime }
 *   cancel-appointment     { appointmentId }
 *
 * Note `practitionerId` is sent from the appointment's `practionerId` field —
 * the typo is in the upstream payload, not here, and renaming it would break the
 * request.
 */

export type Appointment = {
  appointmentId: string;
  dateTime: string;
  status?: string;
  visitTypeName?: string;
  practionerId?: string;
  practitionerName?: string;
  locationId?: string;
  locationAlias?: string;
  locationName?: string;
  [key: string]: unknown;
};

export type Slot = {
  dateTime: string;
  [key: string]: unknown;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const data = await fetchWrapper<any>(`/${path}`, { method: 'POST', body });
  // The mobile-app API reports failure in the body, not the status.
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

export async function listAppointments(): Promise<Appointment[]> {
  const data = await fetchWrapper<any>('/getPatientAppointments');
  return data?.data ?? [];
}

export async function getSlots(
  appt: Appointment,
  date: Date
): Promise<Slot[]> {
  return retry(() =>
    post<Slot[]>('visit-slots', {
      locationId: appt.locationId,
      practitionerId: appt.practionerId,
      visitTypeName: appt.visitTypeName,
      date: date.toISOString().split('T')[0],
    })
  );
}

export async function rescheduleAppointment(
  appt: Appointment,
  dateTime: string
): Promise<void> {
  await retry(() =>
    post('reschedule-appointment', {
      appointmentId: appt.appointmentId,
      locationId: appt.locationId,
      dateTime,
    })
  );
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  await retry(() => post('cancel-appointment', { appointmentId }));
}

/* ----------------------------------------------------------------- helpers */

export type ApptBucket = 'upcoming' | 'past' | 'cancelled';

export function bucketOf(appt: Appointment): ApptBucket {
  const status = String(appt.status ?? '').toLowerCase();
  if (status.includes('cancel')) return 'cancelled';
  const when = new Date(appt.dateTime);
  if (Number.isNaN(when.getTime())) return 'past';
  return when.getTime() > Date.now() ? 'upcoming' : 'past';
}

/**
 * The centre name to display.
 *
 * Issue #5: booking showed "Oncare Cancer Centre, Gurugram" while the
 * appointment card showed "Sector 41, Gurgaon" for the same place. Preferring
 * `locationAlias` and falling back to `locationName` picks one consistently; the
 * real fix is the centre master on the backend, which this will read from once
 * it exists.
 */
export function centreName(appt: Appointment): string {
  return String(appt.locationAlias ?? appt.locationName ?? '').trim();
}

export function doctorName(appt: Appointment): string {
  return String(appt.practitionerName ?? '').trim();
}

/** "Fri, 6 Nov · 2:15 PM" */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${date} · ${time}`;
}
