import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_CLEARANCE, PALETTE, SPACE, SURFACE } from '@/constants/theme';

/**
 * Screen shell: off-white background, gutters, and enough bottom padding that
 * the floating nav never covers the last row.
 *
 * Screens with a bottom nav pass `withNav` so the clearance is added. Getting
 * this wrong is how the old build ended up with SOS over the "Review
 * Appointment" button, so the spacing lives here rather than being re-derived
 * per screen.
 */
export function Screen({
  children,
  scroll = true,
  withNav,
  refreshing,
  onRefresh,
  contentStyle,
  /** Content rendered flush under the header, outside the gutters. */
  bleed,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  withNav?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  bleed?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const bottomPad =
    (withNav ? NAV_CLEARANCE + Math.max(insets.bottom, SPACE.xs) : insets.bottom) +
    SPACE.lg;

  const body = (
    <>
      {bleed}
      <View style={[styles.gutters, contentStyle]}>{children}</View>
    </>
  );

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingBottom: bottomPad }]}>{body}</View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={PALETTE.purple}
            colors={[PALETTE.purple]}
          />
        ) : undefined
      }
    >
      {body}
    </ScrollView>
  );
}

/** Section heading with an optional right-hand action, as used throughout. */
export function SectionRow({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTitle}>{children}</View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  gutters: {
    paddingHorizontal: SPACE.gutter,
    paddingTop: SPACE.lg,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
    gap: SPACE.sm,
  },
  sectionTitle: {
    flex: 1,
  },
});
