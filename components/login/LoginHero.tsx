import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
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

/** How long each slide is held before advancing. */
const SLIDE_MS = 4000;
const FADE_MS = 280;

/**
 * The three hero slides, as i18n key pairs. Driven off keys rather than
 * resolved strings so switching language mid-rotation picks up immediately.
 */
const SLIDES = [
  { line: 'ui.login.heroLine', sub: 'ui.login.heroSub' },
  { line: 'ui.login.heroLine2', sub: 'ui.login.heroSub2' },
  { line: 'ui.login.heroLine3', sub: 'ui.login.heroSub3' },
] as const;

/**
 * The navy hero on screen A1: logo, SOS, the rotating brand line and its dots.
 *
 * The copy advances on its own every four seconds, cross-fading rather than
 * sliding horizontally — a horizontal pager inside the login ScrollView would
 * fight it for the pan gesture. The dots are tappable so the rotation can be
 * driven by hand, and tapping pauses it, because an auto-advance that keeps
 * moving after a deliberate tap feels broken.
 */
export function LoginHero() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  /**
   * A patient who has asked the OS to reduce motion gets the copy without the
   * fade, but still gets the rotation — the words are content, not decoration.
   */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (on) => setReduceMotion(on),
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  /**
   * `goTo` is held in a ref so the interval below can call the latest version
   * without being torn down and recreated on every render — restarting the
   * interval each render is what stops this kind of carousel from ever firing.
   */
  const goTo = useRef<(next: number) => void>(() => {});
  goTo.current = (next: number) => {
    if (next === index) return;

    if (reduceMotion) {
      setIndex(next);
      return;
    }

    Animated.timing(fade, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIndex(next);
      Animated.timing(fade, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      goTo.current((index + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [paused, index]);

  /**
   * The hero carries roughly the top 40% of the screen in the design. Driving it
   * from the viewport rather than fixed padding keeps that proportion on a small
   * phone and stops it looking like a thin strip above a mostly empty screen on
   * a tall one.
   */
  const minHeight = Math.max(300, Math.min(height * 0.42, 420));
  const slide = SLIDES[index];

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

      {/* Announced as one live region so a screen reader reads a slide once,
          rather than the line and the sub-line as two unrelated updates. */}
      <Animated.View
        style={{ opacity: fade }}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
      >
        <Txt variant="titleLg" color={TEXT.onDark} style={styles.line}>
          {t(slide.line)}
        </Txt>
        <Txt variant="helper" color={TEXT.onDarkMuted} style={styles.sub}>
          {t(slide.sub)}
        </Txt>
      </Animated.View>

      <View style={styles.bottomRow}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Pressable
              key={s.line}
              onPress={() => {
                setPaused(true);
                goTo.current(i);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(s.line).replace(/\n/g, ' ')}
              accessibilityState={{ selected: i === index }}
              hitSlop={12}
            >
              <View style={[styles.dot, i === index && styles.dotOn]} />
            </Pressable>
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
    // Matches the screen gutter below it, so the logo lines up with the form.
    paddingHorizontal: SPACE.gutter,
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
    // Two lines reserved: without this the dot row jumps up and down by a line
    // as the slides rotate between one- and two-line sub-copy.
    minHeight: 36,
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
