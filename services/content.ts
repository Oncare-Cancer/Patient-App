import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * Discover content: oncarecancer.com's articles and video library.
 *
 * Public endpoints (no token), read-only. Articles arrive as native blocks,
 * not HTML: the backend converts the CMS rich text per request, so the app
 * renders them with its own type and the CMS is never rewritten. See
 * controllers/mobileAppContent.js.
 */

export type Span = { x: string; b?: 1; i?: 1; href?: string };

export type Block =
  | { t: 'p'; s: Span[] }
  | { t: 'h'; level: 2 | 3 | 4 | 5; s: Span[] }
  | { t: 'ul' | 'ol'; items: Span[][] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'img'; src: string; alt: string }
  | { t: 'video'; id: string };

export type BlogCard = {
  slug: string;
  title: string;
  summary: string;
  img: string;
  alt: string;
  /** "en" | "hi" | "kn" | "ta" */
  lang: string;
  topic: string;
  date: string | null;
  author: { name: string; img: string };
};

export type BlogDetail = BlogCard & {
  banner: string;
  readMin: number;
  author: { name: string; img: string; speciality: string; experience: string };
  blocks: Block[];
  faqs: { q: string; a: Block[] }[];
  url: string;
  related: BlogCard[];
};

export type ChipOption = { id: string; label: string };

export type BlogPage = {
  list: BlogCard[];
  page: number;
  total: number;
  hasMore: boolean;
  langs: ChipOption[];
  topics: ChipOption[];
};

export type Video = {
  /** YouTube id. */
  id: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  short: boolean;
  desc: string;
  url: string;
};

export async function listBlogs(params: {
  lang?: string;
  topic?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<BlogPage> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await fetchWrapper<any>(`/app-blogs${qs ? `?${qs}` : ''}`, { skipAuth: true });
  const d = res?.data ?? {};
  return {
    list: Array.isArray(d.list) ? d.list : [],
    page: Number(d.page) || 0,
    total: Number(d.total) || 0,
    hasMore: Boolean(d.hasMore),
    langs: Array.isArray(d.langs) ? d.langs : [],
    topics: Array.isArray(d.topics) ? d.topics : [],
  };
}

export async function getBlog(slug: string): Promise<BlogDetail | null> {
  const res = await fetchWrapper<any>(`/app-blogs/${encodeURIComponent(slug)}`, {
    skipAuth: true,
  });
  return (res?.data as BlogDetail) ?? null;
}

/**
 * The whole video library, cached for the session.
 *
 * ~400 small items in one response; every Discover screen filters it locally,
 * so it is fetched once rather than per screen.
 */
let videoCache: { at: number; videos: Video[]; categories: string[] } | null = null;
/** The request in flight, so Home and Discover opening together share one. */
let videoInFlight: Promise<{ videos: Video[]; categories: string[] }> | null = null;
const VIDEO_TTL_MS = 10 * 60 * 1000;

export async function listVideos(): Promise<{ videos: Video[]; categories: string[] }> {
  if (videoCache && Date.now() - videoCache.at < VIDEO_TTL_MS) return videoCache;
  if (videoInFlight) return videoInFlight;
  videoInFlight = (async () => {
    const res = await fetchWrapper<any>('/app-videos', { skipAuth: true });
    const d = res?.data ?? {};
    videoCache = {
      at: Date.now(),
      videos: Array.isArray(d.videos) ? d.videos : [],
      categories: Array.isArray(d.categories) ? d.categories : [],
    };
    return videoCache;
  })();
  try {
    return await videoInFlight;
  } finally {
    videoInFlight = null;
  }
}

/** YouTube thumbnail. `hqdefault` is 4:3 with bars; fine for cards. */
export const thumbUrl = (id: string, size: 'hqdefault' | 'mqdefault' | 'maxresdefault' = 'hqdefault') =>
  `https://i.ytimg.com/vi/${id}/${size}.jpg`;

/** "2026-08-10" -> "10 Aug 2026". */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * YouTube titles carry both languages and channel noise:
 * "कीमोथेरेपी से Side Effects | Why Does Chemotherapy Affect Healthy Cells? | Oncare"
 * -> "कीमोथेरेपी से Side Effects · Why Does Chemotherapy Affect Healthy Cells?"
 */
export function cleanVideoTitle(t: string): string {
  return t
    .split('|')
    .map((p) => p.replace(/#\w+/g, '').trim())
    .filter((p) => p && !/^oncare( cancer( care| centre)?)?$/i.test(p))
    .join(' · ');
}
