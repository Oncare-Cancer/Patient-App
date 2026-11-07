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
