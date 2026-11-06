import { Stack } from 'expo-router';

/** Sub-screens reached from Profile (D3). */
export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    />
  );
}
