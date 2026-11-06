import { Stack } from 'expo-router';

/**
 * Guest mode (section 06).
 *
 * A separate route group from (tabs) because a guest has no session: the tabs
 * layout assumes a patient and the root layout bounces signed-out users out of
 * it. Keeping guest screens here means "Explore without login" leads somewhere
 * real instead of looping back to login.
 */
export default function GuestLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
