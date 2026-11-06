import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * The CMS doctor directory.
 *
 * Reads `/app-doctors` and `/app-doctors/:id`, which need no token — browsing
 * doctors and their profiles is open to guests (section 06). The previously
 * used `/doctors` route carries `mobileAppMiddleware`, so calling it without a
 * session returned 401 and the app showed "Session Expired".
 *
 * This is a different source from the practitioners returned during booking:
 * those come from Docpulse and carry `firstName`/`lastName` plus a joined
 * `doctorDetails`, while these are the CMS records the website renders, with
 * the photo, qualifications and expertise a profile page needs.
 */

/** A centre a doctor sits at. */
export type DoctorCentre = {
  id: string;
  name: string;
  address?: string;
};

export type Doctor = {
  id: string;
  name: string;
  /** One-line summary under the name. */
  subheading?: string;
  speciality?: string;
  /**
   * Rendered exactly as stored, e.g. "18+ Years".
   *
   * The value already contains its unit. The old doctor popup appended another
   * "years" and produced "18+ Years years of experience", so nothing here adds
   * a suffix.
   */
  experience?: string;
  img?: string;
  imgAlt?: string;
  /** Free-text city from the CMS, e.g. "Bengaluru". */
  location?: string;
  centres: DoctorCentre[];
  /** True when there is enough content to be worth opening a profile. */
  hasProfile: boolean;
};

export type DoctorProfile = Doctor & {
  about?: string;
  qualifications?: string;
  education?: string;
  advancedTraining?: string;
  awards?: string;
  expertise: string[];
  languages: string[];
  memberships: string[];
  pastExperience: unknown[];
  faqs: { q?: string; a?: string }[];
};

/** Keeps a possibly-absent array usable without a guard at every call site. */
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function toCentre(c: any): DoctorCentre {
  return {
    id: String(c?.id ?? ''),
    name: c?.name ?? '',
    address: c?.address || undefined,
  };
}

function toDoctor(d: any): Doctor {
  return {
    id: String(d?.id ?? ''),
    name: d?.name ?? '',
    subheading: d?.subheading || undefined,
    // The CMS field is `specialisation`; the app's type calls it `speciality`
    // to match the booking flow's naming.
    speciality: d?.specialisation || undefined,
    experience: d?.experience || undefined,
    img: d?.img || undefined,
    imgAlt: d?.imgAlt || undefined,
    location: d?.location || undefined,
    centres: arr<any>(d?.centres).map(toCentre),
    hasProfile: Boolean(d?.hasProfile),
  };
}

export const doctorApi = {
  list: async (): Promise<Doctor[]> => {
    const res = await fetchWrapper<any>('/app-doctors', { skipAuth: true });
    return arr<any>(res?.data).map(toDoctor);
  },

  get: async (id: string): Promise<DoctorProfile | null> => {
    const res = await fetchWrapper<any>(`/app-doctors/${id}`, {
      skipAuth: true,
    });
    const d = res?.data?.doctor;
    if (!d) return null;

    return {
      ...toDoctor(d),
      // The profile's centre list is authoritative: it merges the doctor's own
      // tags with the reverse of each centre's CMS picks.
      centres: arr<any>(res?.data?.centres).map(toCentre),
      about: d.about || undefined,
      qualifications: d.qualifications || undefined,
      education: d.education || undefined,
      advancedTraining: d.advanced_training || undefined,
      awards: d.awards || undefined,
      expertise: arr<string>(d.expertise),
      languages: arr<string>(d.languages),
      memberships: arr<string>(d.memberships),
      pastExperience: arr<unknown>(d.past_experience),
      faqs: arr<{ q?: string; a?: string }>(d.faqs),
    };
  },
};

/** A centre plus the doctors who sit there, for the centre detail screen. */
export async function getCentreDetail(id: string): Promise<{
  centre: any;
  doctors: Doctor[];
} | null> {
  const res = await fetchWrapper<any>(`/app-centres/${id}`, { skipAuth: true });
  if (!res?.data?.centre) return null;
  return {
    centre: res.data.centre,
    doctors: arr<any>(res.data.doctors).map(toDoctor),
  };
}
