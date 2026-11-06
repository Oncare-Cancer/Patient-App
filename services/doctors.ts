import { fetchWrapper } from '@/utils/fetchWrapper';

export type Doctor = {
  id: string;
  name: string;
  speciality?: string;
  /** Pre-formatted, e.g. "15+ yrs". */
  experienceLabel?: string;
  about?: string;
  centres?: string[];
  /** Earliest free slot, e.g. "Today 2:00 PM" — shown on C2. */
  nextFreeSlot?: string;
};

/** Trims "15+ Years" down to "15+ yrs" and leaves anything else alone. */
function experienceLabel(raw: unknown): string | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const text = String(raw).trim();
  // Issue #7: the old doctor popup rendered "15+ Years years of experience"
  // because the template appended its own "years" to a value that already had
  // one. Normalising here means no screen can reintroduce it.
  const years = text.match(/(\d+\+?)/)?.[1];
  return years ? `${years} yrs` : text;
}

export const doctorApi = {
  /**
   * The CMS doctor list. Open to guests — section 06 allows browsing doctors and
   * profiles without a session.
   */
  list: async (): Promise<Doctor[]> => {
    const res = await fetchWrapper<any>('/doctors', { skipAuth: true });
    const raw: any[] = res?.data ?? [];
    return raw.map((d) => ({
      id: String(d._id ?? d.id ?? d.slug ?? d.name),
      name: d.name ?? d.doctorName ?? '',
      speciality: d.speciality ?? d.specialization ?? d.department ?? undefined,
      experienceLabel: experienceLabel(d.experience ?? d.experienceYears),
      about: d.about ?? undefined,
      centres: d.centers ?? d.centres ?? undefined,
      nextFreeSlot: d.nextFreeSlot ?? undefined,
    }));
  },
};
