import { useEffect } from 'react';
import { getGuestContact, type GuestContact } from '@/services/guestIdentity';

/**
 * Fills a guest form with the name and number used last time on this device.
 *
 * Runs when `active` turns true (a sheet opening, a screen mounting) and only
 * if the form is still empty, so it never overwrites anything typed.
 * `isEmpty` is read in the render where `active` became true, which is the
 * form's state at the moment it opened.
 */
export function useGuestPrefill(
  active: boolean,
  isEmpty: boolean,
  apply: (c: GuestContact) => void
) {
  useEffect(() => {
    if (!active || !isEmpty) return;
    let alive = true;
    void getGuestContact().then((c) => {
      if (alive && c) apply(c);
    });
    return () => {
      alive = false;
    };
    // Only on opening; see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
