import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarDays, FileText, User, Plus } from 'lucide-react-native';
import { Txt } from './Txt';
import { useT } from '@/contexts/LanguageContext';
import {
  NAV,
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  TEXT,
} from '@/constants/theme';
import type { StringKey } from '@/constants/i18n';

type TabKey = 'home' | 'activity' | 'records' | 'profile';

const TABS: {
  key: TabKey;
  labelKey: StringKey;
  Icon: typeof Home;
}[] = [
  { key: 'home', labelKey: 'ui.nav.home', Icon: Home },
  { key: 'activity', labelKey: 'ui.nav.activity', Icon: CalendarDays },
  { key: 'records', labelKey: 'ui.nav.records', Icon: FileText },
  { key: 'profile', labelKey: 'ui.nav.profile', Icon: User },
];

/**
 * Floating navy bar: Home · Activity · Book (white +) · Records · Profile.
 *
 * The Book button is a raised white circle that overhangs the bar, so it reads
 * as the primary action rather than a fifth tab — which is why it sits between
 * Activity and Records in the layout but is not part of the TABS list.
 *
 * The active tab carries a small pink dot under its label, matching the design.
 */
export function BottomNav({
  active,
  onTab,
  onBook,
}: {
  active: TabKey;
  onTab: (key: TabKey) => void;
  onBook: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = ({ key, labelKey, Icon }: (typeof TABS)[number]) => {
    const isActive = key === active;
    return (
      <Pressable
        key={key}
        onPress={() => onTab(key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        style={styles.tab}
      >
        <Icon
          size={19}
          color={isActive ? PALETTE.white : 'rgba(255,255,255,0.62)'}
          strokeWidth={isActive ? 2.4 : 2}
        />
        <Txt
          variant="helperSm"
          color={isActive ? PALETTE.white : 'rgba(255,255,255,0.62)'}
          numberOfLines={1}
        >
          {t(labelKey)}
        </Txt>
        <View style={[styles.dot, isActive && styles.dotActive]} />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, SPACE.xs) + NAV.inset },
      ]}
      // The bar floats over the scroll view; screens leave NAV_CLEARANCE of
      // padding so nothing ends up underneath it.
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {left.map(renderTab)}

        <View style={styles.bookSlot}>
          <Pressable
            onPress={onBook}
            accessibilityRole="button"
            accessibilityLabel={t('ui.nav.book')}
            style={({ pressed }) => [styles.book, pressed && styles.pressed]}
          >
            <Plus size={22} color={PALETTE.midnight} strokeWidth={2.8} />
          </Pressable>
          <Txt variant="helperSm" color={PALETTE.white} style={styles.bookLabel}>
            {t('ui.nav.book')}
          </Txt>
        </View>

        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACE.gutter,
    right: SPACE.gutter,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.midnight,
    borderRadius: RADIUS.pill,
    height: NAV.height,
    paddingHorizontal: SPACE.xs,
    ...SHADOW.nav,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    height: '100%',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: PALETTE.pink,
  },
  bookSlot: {
    width: NAV.bookSize + SPACE.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
  },
  book: {
    width: NAV.bookSize,
    height: NAV.bookSize,
    borderRadius: NAV.bookSize / 2,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -NAV.bookOverhang,
    ...SHADOW.button,
  },
  bookLabel: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
  },
});

export type { TabKey };
