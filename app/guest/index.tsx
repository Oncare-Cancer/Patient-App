import { Redirect } from 'expo-router';

/**
 * The old guest home, retired in round 7.
 *
 * Home is now the same screen for everyone - services first, login optional -
 * so a separate guest home would be a second copy to keep in step. This route
 * stays only so links and notifications that still point at /guest land on
 * the real Home instead of a 404.
 */
export default function GuestHome() {
  return <Redirect href="/(tabs)" />;
}
