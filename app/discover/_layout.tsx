import { Stack } from 'expo-router';

/** Screens reached from the Discover tab: articles, videos, shorts, directory. */
export default function DiscoverStackLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
