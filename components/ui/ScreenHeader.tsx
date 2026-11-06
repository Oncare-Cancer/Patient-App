import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Txt } from './Txt';
import { SosPill } from './SosPill';
import {
  GRADIENT,
  RADIUS,
  SPACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

type Props = {
  /** Screen title. Omit for the hero/confirmation headers that carry no title. */
  title?: string;
  /** Small line under the title ("Oncare Gurugram - South City 1"). */
  subtitle?: string;
  /** Show the back chevron. Defaults to true when a title is given. */
  back?: boolean;
  onBack?: () => void;
  /** Icon buttons placed left of the SOS pill (bell, phone). */
  actions?: React.ReactNode;
  /** Hero / greeting / progress content rendered below the top row. */
  children?: React.ReactNode;
  /** Hide the SOS pill. Only for the SOS sheet itself. */
  hideSos?: boolean;
};

/**
 * Navy gradient header with a pink glow at the top-right and a 32 px rounded
 * bottom (section 03).
 *
 * This is the only place the SOS pill is mounted, which is how section 11's rule
 * holds automatically: put a ScreenHeader on a screen and SOS is in the right
 * place, above the content, covering nothing.
 */
export function ScreenHeader({
  title,
  subtitle,
  back,
  onBack,
  actions,
  children,
  hideSos,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showBack = back ?? !!title;

  return (
    <LinearGradient
      colors={[...GRADIENT.header]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + SPACE.sm }]}
    >
      {/* Pink glow, top-right. Decorative only, so it must never swallow a tap. */}
      <LinearGradient
        colors={[...GRADIENT.glow]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glow}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <ChevronLeft size={20} color={TEXT.onDark} strokeWidth={2.4} />
          </Pressable>
        ) : null}

        <View style={styles.titleCol}>
          {title ? (
            <Txt variant="title" color={TEXT.onDark} numberOfLines={1}>
              {title}
            </Txt>
          ) : null}
          {subtitle ? (
            <Txt variant="helper" color={TEXT.onDarkMuted} numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
        </View>

        <View style={styles.actions}>
          {actions}
          {!hideSos && <SosPill />}
        </View>
      </View>

      {children}
    </LinearGradient>
  );
}

/** Circular translucent icon button for the header's action slot. */
export function HeaderIconButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomLeftRadius: RADIUS.header,
    borderBottomRightRadius: RADIUS.header,
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPACE.lg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_MIN,
    gap: SPACE.sm,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    // `transform` here, not `transform-origin` — issue #3 was the latter leaking
    // into the web build as an invalid DOM property.
    ...(Platform.OS === 'web' ? {} : { transform: [{ scale: 0.96 }] }),
  },
});
