import { en, type Strings, type StringsConst } from './en';
import { hi } from './hi';

export type Locale = 'en' | 'hi';

export const LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];

/**
 * Hindi intentionally has no `legal.*` or `clinical.*`, so a lookup that misses
 * falls through to English. That is the mechanism that keeps unreviewed consent
 * copy and translated drug names out of the app — see ./README.md.
 */
const TABLES = {
  en,
  hi: { ...en, ...hi } as Strings,
} satisfies Record<Locale, Strings>;

/** Dotted key path into the string table, e.g. `ui.booking.title`. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Derived from the literal table, so every key is a real path. */
export type StringKey = Leaves<StringsConst>;

/** Values interpolated into `{{placeholders}}`. */
export type TParams = Record<string, string | number>;

function resolve(table: Strings, key: string): string | undefined {
  let node: unknown = table;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole
  );
}

/**
 * Looks up a string for a locale.
 *
 * A missing key returns the key itself rather than an empty string: a visible
 * `ui.booking.titel` in a screenshot gets reported and fixed, whereas a blank
 * space looks like a layout bug and survives to production.
 */
export function translate(
  locale: Locale,
  key: StringKey,
  params?: TParams
): string {
  const hit = resolve(TABLES[locale], key) ?? resolve(TABLES.en, key);
  if (hit === undefined) {
    if (__DEV__) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return interpolate(hit, params);
}

/**
 * True when the locale is written in Devanagari, so `Txt` can pick the Noto face.
 * Kept as a function rather than a flag on the locale list because the answer is
 * about the script, not the language — a future `mr` would also be true here.
 */
export function isDevanagari(locale: Locale): boolean {
  return locale === 'hi';
}

export { en };
export type { Strings };
