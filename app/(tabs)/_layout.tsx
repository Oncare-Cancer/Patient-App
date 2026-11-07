import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { BottomNav, type TabKey } from '@/components/ui';
import { SURFACE } from '@/constants/theme';

/**
 * The five tabs, with the design's floating navy bar.
 *
 * Two things changed from the previous build:
 *
 *  - The native tab bar is hidden and `components/ui/BottomNav` is rendered over
 *    the stack instead. The design's bar floats inset from the screen edges with
 *    a raised white "+" that overhangs it, which a native tab bar cannot do.
 *  - `FloatingCallBubble` is gone. It was the floating SOS that covered "Review
 *    Appointment" and "Contact Support" — issue #8. SOS now lives in the header
 *    of every screen via `ScreenHeader`, so it cannot overlap anything.
 *
 * Book is not a tab. It is a route the "+" pushes to, which is why `BottomNav`
 * takes `onBook` separately from `onTab`.
 */

/** Maps the current route segment to the nav's active key. */
function activeTab(segment: string | undefined): TabKey {
  switch (segment) {
    case 'book':
      // Without this case Book fell through to the default and the bar
      // highlighted Home while the patient was on the booking flow.
      return 'book';
    case 'explore':
      return 'explore';
    case 'documents':
      return 'records';
    case 'profile':
      return 'profile';
    // `appointments` deliberately has no case: Activity is reached from
    // Profile now, so no tab should light up while it is open.
    default:
      return 'home';
  }
}

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();

  // segments is e.g. ['(tabs)', 'documents'].
  const current = activeTab(segments[1] as string | undefined);

  const go = (key: TabKey) => {
    switch (key) {
      case 'home':
        router.replace('/(tabs)');
        return;
      case 'book':
        router.replace('/(tabs)/book');
        return;
      case 'explore':
        router.replace('/(tabs)/explore');
        return;
      case 'records':
        router.replace('/(tabs)/documents');
        return;
      case 'profile':
        router.replace('/(tabs)/profile');
        return;
    }
  };

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

      {/* Book goes through `go` like every other tab: pushing it stacked a
          second copy of the flow each time the "+" was tapped. */}
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
