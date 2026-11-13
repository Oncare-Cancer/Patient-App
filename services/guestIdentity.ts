import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { fetchWrapper } from '@/utils/fetchWrapper';
import type { OpsRequest } from '@/services/requests';

/**
 * What the app remembers about a guest, on this device only.
 *
 *  - Their name and number, so the next form opens filled in instead of
 *    asking again.
 *  - The numbers they have used here (up to 5) and a random device key. Each
 *    guest request is sent with the key, and My Care lists the requests that
 *    match BOTH the number and the key. A number alone lists nothing on the
 *    server, because anyone can type anyone's number (backend
 *    helper/guestKey.js). So a guest sees what they sent from this phone.
 *
 * Nothing here is an account. Clearing the app's data clears it, and the
 * requests themselves stay with the team regardless.
 */

const CONTACT = 'guest_contact';
const PHONES = 'guest_phones';
const KEY = 'guest_device_key';
const MAX_PHONES = 5;

export type GuestContact = { name: string; phone: string; countryCode: string };

/** The last name and number used in a guest form, if any. */
export async function getGuestContact(): Promise<GuestContact | null> {
  try {
    const raw = await AsyncStorage.getItem(CONTACT);
    const c = raw ? (JSON.parse(raw) as GuestContact) : null;
    return c && c.phone ? c : null;
  } catch {
    return null;
  }
}

/** Saved after a guest request goes through, never on a failed one. */
export async function rememberGuestContact(c: GuestContact): Promise<void> {
  if (!c.phone) return;
  try {
    const contact: GuestContact = {
      name: c.name.trim(),
      phone: c.phone,
      countryCode: c.countryCode || '91',
    };
    const raw = await AsyncStorage.getItem(PHONES);
    const list: { phone: string; countryCode: string }[] = raw ? JSON.parse(raw) : [];
    const next = [
      { phone: contact.phone, countryCode: contact.countryCode },
      ...list.filter((p) => !(p.phone === contact.phone && p.countryCode === contact.countryCode)),
    ].slice(0, MAX_PHONES);
    await AsyncStorage.multiSet([
      [CONTACT, JSON.stringify(contact)],
      [PHONES, JSON.stringify(next)],
    ]);
  } catch {
    // Prefill is a convenience; failing to save it must not fail the request.
  }
}

/** This device's random key, made on first use. 32 bytes, hex. */
export async function guestDeviceKey(): Promise<string | undefined> {
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) return existing;
    const bytes = Crypto.getRandomBytes(32);
    const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    await AsyncStorage.setItem(KEY, key);
    return key;
  } catch {
    return undefined;
  }
}

/**
 * The guest requests sent from this device, newest first.
 *
 * Empty, without a network call, until the guest has sent one: no saved
 * number means there is nothing that could match.
 */
export async function listGuestRequests(): Promise<OpsRequest[]> {
  const raw = await AsyncStorage.getItem(PHONES);
  const phones: { phone: string; countryCode: string }[] = raw ? JSON.parse(raw) : [];
  const key = await AsyncStorage.getItem(KEY);
  if (!phones.length || !key) return [];
  const res = await fetchWrapper<any>('/requests/guest/list', {
    method: 'POST',
    body: { phones, guestKey: key },
    skipAuth: true,
  });
  if (res?.code !== 1) throw new Error(res?.message ?? 'Request failed');
  return Array.isArray(res.data) ? (res.data as OpsRequest[]) : [];
}
