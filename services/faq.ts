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

/** Shape is whatever the CMS returns; FAQView has always consumed it loosely. */
export async function getFaqTabs(): Promise<any[]> {
  const data = await retry(() => post<any[]>('getFaqQuestions', {}));
  return data ?? [];
}

export async function askUsEmailQuery(body: {
  name: string;
  email?: string;
  mobile?: string;
  message: string;
}): Promise<void> {
  await post('askUsEmailQuery', body);
}
