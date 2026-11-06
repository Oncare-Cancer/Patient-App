import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Card } from './Card';
import { RADIUS, SPACE, SURFACE } from '@/constants/theme';

/**
 * Loading placeholders.
 *
 * NOT IN THE PDF — the 31 mockups are all happy-path, so loading, empty and
 * error states are design decisions rather than specified screens. They follow
 * the same tokens so they do not look bolted on.
 *
 * Built on reanimated rather than Animated + useNativeDriver for two reasons:
 * the pulse runs on the UI thread so it stays smooth while the list is parsing
 * a response, and `useNativeDriver` is unsupported on web — issue #4 in the
 * PDF's list of existing bugs.
 */
export function SkeletonBlock({
  width = '100%',
  height = 12,
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 820, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: SURFACE.disabled },
        animated,
        style,
      ]}
    />
  );
}

/** A card-shaped placeholder, sized like the list rows it stands in for. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width={38} height={38} radius={19} />
        <View style={styles.col}>
          <SkeletonBlock width="62%" height={13} />
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBlock key={i} width={i === lines - 1 ? '40%' : '84%'} height={10} />
          ))}
        </View>
      </View>
    </Card>
  );
}

/** Several SkeletonCards, for a list that is still loading. */
export function SkeletonList({ count = 4, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: SPACE.sm,
  },
  card: {
    borderRadius: RADIUS.card,
  },
  row: {
    flexDirection: 'row',
    gap: SPACE.sm,
    alignItems: 'center',
  },
  col: {
    flex: 1,
    gap: SPACE.xs,
  },
});
