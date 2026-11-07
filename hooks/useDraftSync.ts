import { useEffect, useRef } from 'react';
import {
  saveRequestDraft,
  type RequestLine,
  type RequestType,
} from '@/services/requests';
import { useAuth } from '@/contexts/AuthContext';

/** How long the cart must sit unchanged before the draft is saved. */
const DEBOUNCE_MS = 1500;

/**
 * Keeps the server's copy of an unsubmitted cart in step with the screen.
 *
 * The central team needs to see carts that were filled and abandoned — the
 * patient's name, number and what they were pricing — so they can call and
 * finish the order. That only works if the cart is persisted before it is
 * submitted, which is what this does.
 *
 * Debounced rather than saved per keystroke: adding five items would otherwise
 * be five writes, and the team only cares about the final state of the cart.
 *
 * Only runs for a signed-in patient. A guest has no identity to attach a cart
 * to, and the endpoint requires a session.
 */
export function useDraftSync(
  type: RequestType,
  lines: RequestLine[],
  /** Set while submitting, so the draft save does not race the real submit. */
  paused?: boolean
) {
  const { isAuthenticated } = useAuth();

  // Compared as a string so the effect fires on real content changes rather
  // than on every new array identity from a re-render.
  const signature = JSON.stringify(
    lines.map((l) => [l.name, l.strength, l.quantity, l.matchStatus])
  );
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || paused) return;
    if (lastSaved.current === signature) return;

    const id = setTimeout(() => {
      lastSaved.current = signature;
      void saveRequestDraft({ type, lines });
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
    // `lines` is intentionally not a dependency: `signature` is its content.
  }, [signature, isAuthenticated, paused, type]);
}
