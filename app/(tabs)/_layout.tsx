import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { BottomNav, TAB_ROUTES, type TabKey } from '@/components/ui';
import { SURFACE } from '@/constants/theme';

/**
 * The five tabs, with the design's floating navy bar.
 *
 * The native tab bar is hidden and `components/ui/BottomNav` is rendered over
 * the stack instead: the design's bar floats inset from the screen edges with
 * a raised white "+" that overhangs it, which a native tab bar cannot do.
 *
 * Round 7: every tab is open to a guest. My Care and Profile show their own
 * "log in to see this" state instead of a login wall, so the nav never
 * bounces anybody to /login.
 */

/** Maps the current route segment to the nav's active key. */
function activeTab(segment: string | undefined): TabKey {
  switch (segment) {
    case 'book':
      return 'book';
    case 'explore':
      return 'discover';
    // My Care is one tab over two routes: appointments + requests live in
    // appointments.tsx, and the old Records route still opens on its own.
    case 'appointments':
    case 'documents':
      return 'myCare';
    case 'profile':
      return 'profile';
    default:
      return 'home';
  }
}

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();

  // segments is e.g. ['(tabs)', 'appointments'].
  const current = activeTab(segments[1] as string | undefined);

  // `replace`, not `push`: tabs are siblings, and pushing stacked a second
  // copy of a tab each time it was tapped.
  const go = (key: TabKey) => router.replace(TAB_ROUTES[key] as never);

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // The design's bar is rendered below; the native one would sit under
          // it and eat the bottom inset.
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="book" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="appointments" />
        <Tabs.Screen name="documents" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <BottomNav active={current} onTab={go} onBook={() => go('book')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
});
