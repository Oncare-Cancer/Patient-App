import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SosPill, Txt, LanguageSegmented, Logo } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SPACE,
  TEXT,
} from '@/constants/theme';

/**
 * The navy hero on screen A1: logo, SOS, the brand line and a progress dot row.
 */
export function LoginHero({ step }: { step: 0 | 1 | 2 }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  /**
   * The hero carries roughly the top 40% of the screen in the design. Driving it
   * from the viewport rather than fixed padding keeps that proportion on a small
   * phone and stops it looking like a thin strip above a mostly empty screen on
   * a tall one.
   */
  const minHeight = Math.max(300, Math.min(height * 0.42, 420));

  return (
    <LinearGradient
      colors={[...GRADIENT.header]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + SPACE.md, minHeight }]}
    >
      <LinearGradient
        colors={[...GRADIENT.glow]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glow}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <Logo height={24} />
        <SosPill />
      </View>

      {/* Pushes the brand line down so it sits against the dot row rather than
          floating directly under the logo. */}
      <View style={styles.spacer} />

      <Txt variant="titleLg" color={TEXT.onDark} style={styles.line}>
        {t('ui.login.heroLine')}
      </Txt>
      <Txt variant="helper" color={TEXT.onDarkMuted} style={styles.sub}>
        {t('ui.login.heroSub')}
      </Txt>

      <View style={styles.bottomRow}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        {/* Not in the PDF: language is offered here so a Hindi reader can switch
            before being asked to read anything. */}
        <LanguageSegmented onDark />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderBottomLeftRadius: RADIUS.header,
    borderBottomRightRadius: RADIUS.header,
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.lg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    flex: 1,
    minHeight: SPACE.xl,
  },
  line: {
    // 26px over three lines, slightly larger than the 21 the type scale gives,
    // because this is display copy rather than a screen title.
    fontSize: 26,
    lineHeight: 34,
  },
  sub: {
    marginTop: SPACE.sm,
    maxWidth: 280,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACE.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotOn: {
    width: 18,
    backgroundColor: PALETTE.pink,
  },
});
