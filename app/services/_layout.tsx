import { Stack } from 'expo-router';

/**
 * The six care services from section 05's grid.
 *
 * A stack rather than tabs: each service is a short linear flow that ends in a
 * submitted screen, and the patient should come back to Home afterwards rather
 * than being left inside a service shell.
 */
export default function ServicesLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    />
  );
}
