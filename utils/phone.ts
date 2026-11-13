/**
 * Phone validation for patients in India and abroad.
 *
 * Mirrors helper/phone.js on the backend, so a number the app accepts is a
 * number the server accepts:
 *   +91       10 digits starting 6-9 (pasted "+91..." / "0..." forms are cleaned)
 *   elsewhere 6+ digits, and at most 15 including the code (the E.164 limit)
 *
 * The rule outside India is structural on purpose: a per-country table would
 * reject real numbers from countries it does not list.
 */

export const DEFAULT_COUNTRY_CODE = '91';

/** "+91" / "91" / " +44 " -> "91" / "44". At most 4 digits, no leading 0. */
export function cleanCountryCode(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 4);
}

/** The number as the patient should keep typing it. */
export function cleanNational(raw: string, countryCode: string): string {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (countryCode === '91') {
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return d.slice(0, 10);
  }
  return d.replace(/^0+/, '').slice(0, Math.max(6, 15 - countryCode.length));
}

export function isValidPhone(national: string, countryCode: string): boolean {
  if (!/^[1-9]\d{0,3}$/.test(countryCode)) return false;
  if (countryCode === '91') return /^[6-9]\d{9}$/.test(national);
  return /^\d+$/.test(national) && national.length >= 6 && countryCode.length + national.length <= 15;
}
