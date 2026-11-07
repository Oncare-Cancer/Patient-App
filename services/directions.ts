import { Linking, Platform } from 'react-native';

/**
 * Opens maps directions to a centre.
 *
 * One helper for every "Directions" button in the app, because the previous
 * per-screen versions each guessed differently and mostly guessed badly: the
 * appointment card and the confirmed screen both searched on the Docpulse
 * centre label, which is the literal string "Oncare Cancer Center" for EVERY
 * location — so maps opened on whichever Oncare it felt like, or nothing.
 *
 * The order here is deliberate, most precise first:
 *
 *   1. Stored coordinates. The CMS keeps `latLong` as one comma-separated
 *      string per centre; this is exact and language-independent.
 *   2. Name plus full postal address. Unambiguous enough for a text search.
 *   3. The label alone. Last resort, and the case that used to be the only one.
 */

export type DirectionsTarget = {
  name?: string;
  address?: string;
  /** "13.0167, 77.6364" as stored by the CMS. */
  latLong?: string | null;
  lat?: number;
  lng?: number;
};

/**
 * Finds the centre record behind a booking, so Directions has a real address.
 *
 * An appointment carries a Docpulse `locationId` and a label. The label is the
 * literal string "Oncare Cancer Center" for every location in Docpulse, so it
 * cannot be searched on — matching has to go through the id, which the centre
 * list now carries (resolved server-side in helper/centreDocpulse.js).
 *
 * Falls back to a name match for the rare centre that could not be resolved to
 * a location, and returns null rather than a guess when nothing matches: a
 * Directions button that opens the wrong centre is worse than one that opens a
 * plain search.
 */
export function matchCentre<
  T extends { locationId?: string; name?: string; slug?: string }
>(
  centres: T[],
  appointment: { locationId?: string; locationAlias?: string; locationName?: string }
): T | null {
  const id = String(appointment.locationId ?? '').trim();
  if (id) {
    const byId = centres.find((c) => String(c.locationId ?? '') === id);
    if (byId) return byId;
  }

  // The label is only worth trying when it is not the generic Docpulse one.
  const label = String(appointment.locationAlias ?? appointment.locationName ?? '')
    .trim()
    .toLowerCase();
  const generic = /^oncare\s*(cancer)?\s*(centre|center)?$/.test(label);
  if (!label || generic) return null;

  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = squash(label);
  return (
    centres.find((c) => {
      const name = squash(String(c.name ?? ''));
      const slug = squash(String(c.slug ?? ''));
      return (
        (name.length > 2 && (target.includes(name) || name.includes(target))) ||
        (slug.length > 2 && (target.includes(slug) || slug.includes(target)))
      );
    }) ?? null
  );
}

/** Parses the CMS's single comma-separated coordinate string. */
function coordsOf(target: DirectionsTarget): string | null {
  if (
    typeof target.lat === 'number' &&
    typeof target.lng === 'number' &&
    Number.isFinite(target.lat) &&
    Number.isFinite(target.lng)
  ) {
    return `${target.lat},${target.lng}`;
  }

  const [a, b] = String(target.latLong ?? '')
    .split(',')
    .map((v) => Number(v.trim()));
  if (Number.isFinite(a) && Number.isFinite(b)) return `${a},${b}`;

  return null;
}

/** The best query we can build for this centre, or null if we have nothing. */
export function directionsQuery(target: DirectionsTarget): string | null {
  const coords = coordsOf(target);
  if (coords) return coords;

  const name = String(target.name ?? '').trim();
  const address = String(target.address ?? '').trim();

  if (address) return [name, address].filter(Boolean).join(', ');
  return name || null;
}

/**
 * Hands the query to the platform's maps app.
 *
 * Google Maps' universal URL is used rather than the `geo:`/`maps://` schemes
 * because it resolves in a browser when no maps app is installed, so the button
 * cannot silently do nothing. Coordinates are passed through as-is, which both
 * platforms treat as an exact point rather than a search term.
 */
export function openDirections(target: DirectionsTarget): void {
  const query = directionsQuery(target);
  if (!query) return;

  const encoded = encodeURIComponent(query);
  const universal = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  // Try the native app first so directions open where the patient expects.
  const native =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${encoded}`
      : `geo:0,0?q=${encoded}`;

  Linking.canOpenURL(native)
    .then((ok) =>
      Linking.openURL(ok ? native : universal).catch(() =>
        Linking.openURL(universal).catch(() => {})
      )
    )
    .catch(() => Linking.openURL(universal).catch(() => {}));
}
