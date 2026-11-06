import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * FAQ and the "raise a query" form.
 *
 * Lifted verbatim out of the old Profile screen so the behaviour is unchanged:
 * same `getFaqQuestions` and `askUsEmailQuery` endpoints, same `code !== 1`
 * convention, same two retries with an 800 ms gap. Only the location moved, so
 * the screens can be rebuilt without touching the transport.
 */

async function post<T>(path: string, body: unknown): Promise<T> {
  const data = await fetchWrapper<any>(`/${path}`, { method: 'POST', body });
  // The mobile-app API signals failure in the body, not the status code.
  if (data.code !== 1) throw new Error(data.message ?? 'Request failed');
  return data.data as T;
}

/**
 * Retries twice before giving up.
 *
 * Kept from the original: the FAQ list is served off a CMS collection that
 * occasionally cold-starts, and a single failure used to leave the Help section
 * empty with no explanation.
 */
async function retry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 800));
    return retry(fn, retries - 1);
  }
}

/**
 * Help topics.
 *
 * Each entry is `{ key, title, subtitle, page }` where `page` holds the
 * heading, CTA copy and the `groups` array of question/answer pairs. `FAQView`
 * consumes the inner `page`, not the wrapper — see `faqPage` below.
 */
export type FaqTab = {
  /** Mongo id when the CMS serves these from a collection. */
  _id?: string;
  key?: string;
  title?: string;
  /** Older payloads label the topic `name` rather than `title`. */
  name?: string;
  subtitle?: string;
  page?: FaqPage;
};

export type FaqPage = {
  heading?: string;
  subheading?: string;
  ctaText?: string;
  formTitle?: string;
  formSubtitle?: string;
  groups?: { title?: string; items?: { q?: string; a?: string }[] }[];
};

export async function getFaqTabs(): Promise<FaqTab[]> {
  const data = await retry(() => post<FaqTab[]>('getFaqQuestions', {}));
  return data ?? [];
}

/**
 * Unwraps the page a topic renders from.
 *
 * `FAQView` reads `data.groups`, `data.heading` and so on directly, so handing
 * it the wrapper object left `groups` undefined and crashed the screen on
 * `data.groups.map`. The fallback covers a flattened shape in case the CMS
 * starts returning the page without the wrapper.
 */
export function faqPage(tab: FaqTab): FaqPage {
  const page = tab?.page ?? (tab as FaqPage);
  return { ...page, groups: page?.groups ?? [] };
}

/**
 * Raise a query.
 *
 * The field names are the backend's, not ours. `controllers/mobileApp.js`
 * destructures `{ email, userquery }`, rejects a missing email with a 400, and
 * takes the patient's name and mobile from the authenticated session rather
 * than the body — so sending `{ name, mobile, message }` failed every time.
 */
export async function askUsEmailQuery(body: {
  email: string;
  userquery: string;
}): Promise<void> {
  await post('askUsEmailQuery', body);
}
