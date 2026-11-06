import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * Patient-facing lab and pharmacy catalogue.
 *
 * These endpoints are served by the main backend under /mobile-app/, which
 * proxies the analytics backend where `labCosts` and `pharmacyCosts` actually
 * live. The app talks to one host and keeps the session it already has; see the
 * architecture note in the plan.
 *
 * Why the shapes below are not just the raw collections:
 *
 *  - `sellingPrice` is the patient's price for a lab test and `mrp` is the
 *    patient's price for a medicine. `cost` / `costPrice` are what Oncare pays
 *    its suppliers and must never reach the app, so they are not in these types
 *    at all — a field that does not exist cannot be rendered by mistake.
 *  - `price` is nullable. 49% of lab items and 17% of medicines have no usable
 *    patient price, and the UI shows "Price on confirmation" for those rather
 *    than a misleading zero.
 *  - `displayName` is separate from the catalogue's `itemName`, which is a raw
 *    billing string like "PCD-NG0178-Liquidseq Comprehensive panel". The backend
 *    strips the lab-code prefix; until Ops curates proper names, the stripped
 *    form is the best available and is what the patient sees.
 */

export type LabTest = {
  id: string;
  /** Cleaned, patient-facing name. */
  displayName: string;
  /** Null when the catalogue has no selling price for this item. */
  price: number | null;
  /** Turnaround, e.g. "24 hrs". Absent until Ops fills it in. */
  tat?: string;
  /** Whether a sample can be collected at home. Absent until Ops fills it in. */
  homeCollection?: boolean;
  /** Category chip: popular | tumour | blood | liverKidney. */
  category?: string;
};

export type Medicine = {
  id: string;
  displayName: string;
  genericName?: string;
  /** Null when the catalogue has no MRP for this item. */
  price: number | null;
  /** e.g. "Strip of 10 tablets". Absent until Ops fills it in. */
  packSize?: string;
  /** Whether a prescription is needed before dispatch. */
  rxRequired?: boolean;
};

export type Paged<T> = {
  list: T[];
  totalCount: number;
};

type City = 'DELHI/NCR' | 'BANGALORE';

/**
 * Lab tests, filtered by city because the same test is priced differently per
 * lab partner — ₹500 in Delhi vs ₹760 in Bangalore for a KFT, so showing a
 * single number would be wrong for half the patients.
 */
export async function searchLabTests(params: {
  search?: string;
  category?: string;
  city?: City;
  /** Resolved to a city server-side when no explicit city is given. */
  pincode?: string;
  index?: number;
  limit?: number;
}): Promise<Paged<LabTest>> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.city) query.set('city', params.city);
  if (params.pincode) query.set('pincode', params.pincode);
  query.set('index', String(params.index ?? 0));
  query.set('limit', String(params.limit ?? 20));

  const res = await fetchWrapper<any>(`/catalog/lab-tests?${query}`, {
    skipAuth: true,
  });
  return { list: res?.data?.list ?? [], totalCount: res?.data?.totalCount ?? 0 };
}

export async function searchMedicines(params: {
  search?: string;
  index?: number;
  limit?: number;
}): Promise<Paged<Medicine>> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  query.set('index', String(params.index ?? 0));
  query.set('limit', String(params.limit ?? 20));

  const res = await fetchWrapper<any>(`/catalog/medicines?${query}`, {
    skipAuth: true,
  });
  return { list: res?.data?.list ?? [], totalCount: res?.data?.totalCount ?? 0 };
}

export type Centre = {
  id: string;
  /** Short name as patients know it, e.g. "Oncare Gurugram". */
  name: string;
  area?: string;
  address: string;
  city: string;
  phone?: string;
  lat?: number;
  lng?: number;
  /** Straight-line km from the patient, when location was shared. */
  distanceKm?: number;
};

/**
 * The centre master. One list, so a centre's name cannot differ between booking
 * and the appointment card — issue #5.
 */
export async function getCentres(params?: {
  lat?: number;
  lng?: number;
}): Promise<Centre[]> {
  const query = new URLSearchParams();
  if (params?.lat !== undefined) query.set('lat', String(params.lat));
  if (params?.lng !== undefined) query.set('lng', String(params.lng));

  const res = await fetchWrapper<any>(
    `/catalog/centres${query.toString() ? `?${query}` : ''}`,
    { skipAuth: true }
  );
  return res?.data ?? [];
}
