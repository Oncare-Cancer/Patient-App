import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Centre } from '@/services/catalog';

/**
 * The patient's APPROXIMATE location, and which Oncare centre is nearest.
 *
 * WHAT THIS ASKS FOR, AND WHY NOT MORE
 * Approximate, while the app is in use. Never precise, never background:
 * app.json blocks the precise and background permissions on Android and the
 * iOS build defaults to reduced accuracy. "Which of nine centres is nearest,
 * and is it within 50 km" needs a few kilometres of accuracy, not metres.
 *
 * WHEN IT ASKS
 * Only when the patient does something that uses it - opening Book, or
 * submitting a request - and only while the permission is still undetermined.
 * After a "no" it never asks again on its own; the Book screen's explicit
 * "Use my location" button is the one place that may (`force`), because the
 * patient pressed it.
 *
 * No external API: distances are computed on the phone from the centres'
 * own coordinates (haversine, below).
 */

export type ApproxLocation = {
  lat: number;
  lng: number;
  /** Metres. Approximate fixes on Android are typically 1-3 km. */
  accuracy?: number;
  capturedAt: string;
};

/** A centre more than this far away is not "near you" - pick one instead. */
export const NEAREST_MAX_KM = 50;

/** A fix this recent is reused rather than asking the GPS again. */
const FRESH_MS = 30 * 60 * 1000;

const CACHE_KEY = 'location.last';
const CENTRE_KEY = 'booking.centre';

let memo: ApproxLocation | null = null;

function isFresh(loc: ApproxLocation | null): loc is ApproxLocation {
  return !!loc && Date.now() - new Date(loc.capturedAt).getTime() < FRESH_MS;
}

/** Resolves to `null` after `ms` instead of hanging on a slow fix. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

export async function locationPermission(): Promise<LocationPermission> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'denied';
  }
}

/**
 * The patient's approximate location, or null.
 *
 * Never throws: every caller treats "no location" as a normal answer - the
 * patient may have said no, be indoors, or be on a phone with location off.
 *
 *   prompt  ask the OS if the permission is still undetermined (default true)
 *   force   ask even after an earlier "no" - only for an explicit tap
 */
export async function getApproxLocation({
  prompt = true,
  force = false,
  timeoutMs = 6000,
}: { prompt?: boolean; force?: boolean; timeoutMs?: number } = {}): Promise<ApproxLocation | null> {
  try {
    if (isFresh(memo)) return memo;
    if (!memo) {
      const stored = await AsyncStorage.getItem(CACHE_KEY);
      const parsed = stored ? (JSON.parse(stored) as ApproxLocation) : null;
      if (isFresh(parsed)) {
        memo = parsed;
        return parsed;
      }
    }

    let perm = await locationPermission();
    if (perm !== 'granted' && (force || (prompt && perm === 'undetermined'))) {
      const res = await Location.requestForegroundPermissionsAsync();
      perm = res.status === 'granted' ? 'granted' : 'denied';
    }
    if (perm !== 'granted') return null;

    // A recent fix the OS already has is instant and costs no battery.
    const last = await Location.getLastKnownPositionAsync({ maxAge: FRESH_MS }).catch(() => null);
    const pos =
      last ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        timeoutMs
      ));
    if (!pos) return null;

    const loc: ApproxLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      capturedAt: new Date(pos.timestamp || Date.now()).toISOString(),
    };
    memo = loc;
    void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(loc)).catch(() => {});
    return loc;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- geometry */

const EARTH_RADIUS_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km (haversine). Same formula as the backend. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type NearestCentre = { centre: Centre; km: number };

/**
 * The bookable centre nearest to `here`, or null when none is within
 * NEAREST_MAX_KM.
 *
 * Only centres with coordinates AND a Docpulse locationId are considered: a
 * centre that cannot be booked is not an answer to "book near me".
 */
export function nearestCentre(
  centres: Centre[],
  here: { lat: number; lng: number }
): NearestCentre | null {
  let best: NearestCentre | null = null;
  for (const c of centres) {
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number' || !c.locationId) continue;
    const km = haversineKm(here, { lat: c.lat, lng: c.lng });
    if (!best || km < best.km) best = { centre: c, km };
  }
  if (!best || best.km > NEAREST_MAX_KM) return null;
  return { centre: best.centre, km: Math.round(best.km * 10) / 10 };
}

/** Every centre with its distance, nearest first. Centres without coordinates last. */
export function centresByDistance(
  centres: Centre[],
  here: { lat: number; lng: number } | null
): { centre: Centre; km: number | null }[] {
  return centres
    .map((c) => ({
      centre: c,
      km:
        here && typeof c.lat === 'number' && typeof c.lng === 'number'
          ? Math.round(haversineKm(here, { lat: c.lat, lng: c.lng }) * 10) / 10
          : null,
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
}

/* ----------------------------------------------------- remembered centre */

/**
 * The centre the patient booked at last time (a Docpulse locationId), so the
 * next booking opens straight on its doctors with a "Change centre" link.
 */
export async function rememberedCentreId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CENTRE_KEY);
  } catch {
    return null;
  }
}

export async function rememberCentre(locationId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CENTRE_KEY, locationId);
  } catch {
    // Remembering is a convenience; losing it only costs one tap next time.
  }
}
