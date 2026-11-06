import { useEffect, useState } from 'react';

/**
 * Delays a changing value so a per-keystroke effect becomes one request.
 *
 * Used by the catalogue searches: `labCosts` is 17,447 rows and
 * `pharmacyCosts` 3,132, so search has to run server-side, and firing it on
 * every character would mean a dozen in-flight requests while someone types
 * "capecitabine".
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return settled;
}
