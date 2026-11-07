import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * The doctor and centre catalogue.
 *
 * Reads `/app-doctors`, `/app-doctors/:id`, `/app-centres/:id` — none of which
 * need a token, because browsing doctors and centres is open to guests
 * (section 06). The previously used `/doctors` route carries
 * `mobileAppMiddleware`, so calling it without a session returned 401 and the
 * app showed "Session Expired".
 *
 * The backend flattens every CMS rich-text field to plain text and normalises
 * the two different FAQ shapes into one, so everything here is display-ready.
 */

/** A centre a doctor sits at. */
export type DoctorCentre = {
  id: string;
  name: string;
  address?: string;
};

export type Faq = { q: string; a: string };

export type Doctor = {
  /**
   * For a doctor listed under a centre this is the DOCPULSE practitioner id,
   * because that is what a booking needs. Use `profileId` to open the profile.
   */
  id: string;
  /** The CMS record id, when one exists. Empty when the doctor is not on the website. */
  profileId?: string;
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
  /** True when there is a CMS record worth opening a profile for. */
  hasProfile: boolean;
};

export type DoctorProfile = Doctor & {
  about?: string;
  qualifications?: string;
  advancedTraining?: string;
  expertise: string[];
  education: string[];
  /** Career history. Distinct from `experience`, which is the years string. */
  pastExperience: string[];
  awards: string[];
  languages: string[];
  memberships: string[];
  publications: { title: string; journal?: string; link?: string }[];
  faqs: Faq[];
};

/** One content block from the centre's CMS page. */
export type CentreSection = {
  /** "text" | "video_url" | whatever the CMS stores. */
  type: string;
  heading: string;
  body: string;
  /** Embed URL, present on video sections. */
  video?: string;
};

export type CentreReview = {
  name: string;
  stars: number;
  review: string;
};

export type CentreDetail = {
  centre: {
    id: string;
    name: string;
    slug?: string;
    address: string;
    city: string;
    phone?: string;
    latLong?: string;
    /** bannerImg, falling back to mobimg — `img` is empty on every centre. */
    image?: string;
    about?: string;
    businessHours?: unknown[];
  };
  doctors: Doctor[];
  /** "docpulse" when the bookable list was available, else "cms". */
  doctorSource: string;
  /** The Docpulse location, when resolved. Needed to preselect a booking. */
  locationId?: string | null;
  faqs: Faq[];
  reviews: CentreReview[];
  sections: CentreSection[];
};

/** Keeps a possibly-absent array usable without a guard at every call site. */
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function toCentreRef(c: any): DoctorCentre {
  return {
    id: String(c?.id ?? ''),
    name: c?.name ?? '',
    address: c?.address || undefined,
  };
}

function toDoctor(d: any): Doctor {
  return {
    id: String(d?.id ?? ''),
    profileId: d?.profileId ? String(d.profileId) : undefined,
    name: d?.name ?? '',
    subheading: d?.subheading || undefined,
    // The CMS field is `specialisation`; the app calls it `speciality` to match
    // the booking flow's naming.
    speciality: d?.specialisation || d?.speciality || undefined,
    experience: d?.experience || undefined,
    img: d?.img || undefined,
    imgAlt: d?.imgAlt || undefined,
    location: d?.location || undefined,
    centres: arr<any>(d?.centres).map(toCentreRef),
    hasProfile: Boolean(d?.hasProfile),
  };
}

function toFaqs(raw: unknown): Faq[] {
  return arr<any>(raw)
    .map((f) => ({ q: String(f?.q ?? ''), a: String(f?.a ?? '') }))
    .filter((f) => f.q && f.a);
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
      centres: arr<any>(res?.data?.centres).map(toCentreRef),
      about: d.about || undefined,
      qualifications: d.qualifications || undefined,
      advancedTraining: d.advancedTraining || undefined,
      expertise: arr<string>(d.expertise),
      education: arr<string>(d.education),
      pastExperience: arr<string>(d.pastExperience),
      awards: arr<string>(d.awards),
      languages: arr<string>(d.languages),
      memberships: arr<string>(d.memberships),
      publications: arr<any>(d.publications).map((p) => ({
        title: String(p?.title ?? ''),
        journal: p?.journal || undefined,
        link: p?.link || undefined,
      })),
      faqs: toFaqs(d.faqs),
    };
  },
};

/** A centre with everything its page renders. */
export async function getCentreDetail(
  id: string
): Promise<CentreDetail | null> {
  const res = await fetchWrapper<any>(`/app-centres/${id}`, { skipAuth: true });
  const c = res?.data?.centre;
  if (!c) return null;

  return {
    centre: {
      id: String(c.id),
      name: c.name ?? '',
      slug: c.slug || undefined,
      address: c.address ?? '',
      city: c.city ?? '',
      phone: c.phone || undefined,
      latLong: c.latLong || undefined,
      image: c.image || undefined,
      about: c.about || undefined,
      businessHours: arr<unknown>(c.businessHours),
    },
    doctors: arr<any>(res.data.doctors).map(toDoctor),
    doctorSource: String(res.data.doctorSource ?? 'cms'),
    locationId: res.data.locationId ?? null,
    faqs: toFaqs(res.data.faqs),
    reviews: arr<any>(res.data.reviews).map((r) => ({
      name: String(r?.name ?? ''),
      stars: Number(r?.stars) || 0,
      review: String(r?.review ?? ''),
    })),
    sections: arr<any>(res.data.sections).map((s) => ({
      type: String(s?.type ?? 'text'),
      heading: String(s?.heading ?? ''),
      body: String(s?.body ?? ''),
      video: s?.video || undefined,
    })),
  };
}
