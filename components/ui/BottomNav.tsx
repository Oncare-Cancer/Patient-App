import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, HeartPulse, LogIn, User, Plus } from 'lucide-react-native';
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

/**
 * `book` is in the union even though it is not in TABS: the "+" is a route like
 * any other, so it needs an active state, but it renders as the raised circle
 * rather than a tab.
 */
type TabKey = 'home' | 'discover' | 'book' | 'myCare' | 'profile';

/**
 * Where each tab goes. One table for the tabs layout AND GuestNav, so the two
 * bars can never send the same tap to different places again - which is how
 * a guest on Discover used to tap Home and land on the login wall.
 *
 *   Home      services, and "your next step" once signed in
 *   Discover  articles, videos, centres, doctors, FAQs (was Explore)
 *   Book      consultation booking only
 *   My Care   appointments, requests and reports in one place
 *   Profile   details and settings; signed-in only (a guest sees Login)
 */
const TAB_ROUTES = {
  home: '/(tabs)',
  discover: '/(tabs)/explore',
  book: '/(tabs)/book',
  myCare: '/(tabs)/appointments',
  profile: '/(tabs)/profile',
} as const satisfies Record<TabKey, string>;

/**
 * Each tab has one job (round 7). Search, Explore and the Home search box used
 * to be three ways into the same doctor list; now finding a doctor lives in
 * Book, browsing lives in Discover, and the patient's own records - which
 * were split across Records and a Profile-only Activity screen - are one tab.
 */
const TABS: {
  key: Exclude<TabKey, 'book'>;
  labelKey: StringKey;
  Icon: typeof Home;
}[] = [
  { key: 'home', labelKey: 'ui.nav.home', Icon: Home },
  { key: 'discover', labelKey: 'ui.nav.discover', Icon: Compass },
  { key: 'myCare', labelKey: 'ui.nav.myCare', Icon: HeartPulse },
  { key: 'profile', labelKey: 'ui.nav.profile', Icon: User },
];

/**
 * Floating navy bar: Home · Discover · Book (white +) · My Care · Profile.
 *
 * The Book button is a raised white circle that overhangs the bar, so it reads
 * as the primary action rather than a fifth tab — which is why it sits between
 * Discover and My Care in the layout but is not part of the TABS list.
 *
 * The active tab carries a small pink dot under its label, matching the design.
 */
export function BottomNav({
  active,
  onTab,
  onBook,
  guest = false,
  onLogin,
}: {
  active: TabKey;
  onTab: (key: TabKey) => void;
  onBook: () => void;
  /**
   * Profile is for signed-in patients only, so a guest gets Login in its slot.
   * Same place, so the bar keeps its shape and a returning patient finds the
   * way in where their profile will be.
   */
  guest?: boolean;
  onLogin?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  const bookActive = active === 'book';

  const renderTab = (tab: (typeof TABS)[number]) => {
    const asLogin = guest && tab.key === 'profile';
    const { key } = tab;
    const labelKey: StringKey = asLogin ? 'ui.login.login' : tab.labelKey;
    const Icon = asLogin ? LogIn : tab.Icon;
    const isActive = !asLogin && key === active;
    return (
      <Pressable
        key={key}
        onPress={() => (asLogin && onLogin ? onLogin() : onTab(key))}
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
            accessibilityRole="tab"
            accessibilityLabel={t('ui.nav.book')}
            accessibilityState={{ selected: bookActive }}
            style={({ pressed }) => [
              styles.book,
              bookActive && styles.bookActive,
              pressed && styles.pressed,
            ]}
          >
            <Plus
              size={22}
              color={bookActive ? PALETTE.pink : PALETTE.midnight}
              strokeWidth={2.8}
            />
          </Pressable>
          <Txt variant="helperSm" color={PALETTE.white} style={styles.bookLabel}>
            {t('ui.nav.book')}
          </Txt>
          {/* Same pink dot the tabs use, so "you are on Book" is shown the way
              "you are on Home" is. */}
          <View style={[styles.dot, bookActive && styles.dotActive]} />
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
    borderWidth: 2,
    // Transparent rather than absent so turning the ring on does not resize
    // the circle and shift the "+" by 2px.
    borderColor: 'transparent',
    ...SHADOW.button,
  },
  /** Pink ring + pink "+" while on the Book route. */
  bookActive: {
    borderColor: PALETTE.pink,
  },
  bookLabel: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
  },
});

export type { TabKey };
export { TAB_ROUTES };
