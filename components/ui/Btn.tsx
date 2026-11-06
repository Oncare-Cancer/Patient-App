import React from 'react';
import {
  Pressable,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from './Txt';
import {
  PALETTE,
  TEXT,
  RADIUS,
  SHADOW,
  SPACE,
  TOUCH_MIN,
  GRADIENT,
  SURFACE,
} from '@/constants/theme';

type Variant =
  /** Navy pill — the single main action on a screen. */
  | 'primary'
  /** Navy outline pill. */
  | 'secondary'
  /** Violet-to-pink gradient, for "selected"-flavoured actions. */
  | 'gradient'
  /** Text-only, for "Change" / "Edit details" style links. */
  | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Icon rendered before the label. */
  icon?: React.ReactNode;
  /** Stretch to the container width. Default true for primary/secondary. */
  block?: boolean;
  style?: ViewStyle;
  /** Smaller pill for inline actions (Directions / Reschedule / Cancel on D1). */
  compact?: boolean;
};

/**
 * The PDF defines exactly two button shapes — navy pill and navy outline pill —
 * plus the violet-to-pink gradient used for selected states. Everything else is
 * a text link. Keeping that set small is what makes the screens look consistent,
 * so resist adding variants here without a design reason.
 */
export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  block,
  compact,
  style,
}: Props) {
  const isBlock = block ?? (variant === 'primary' || variant === 'secondary');
  const inert = disabled || loading;

  const labelColour =
    variant === 'primary' || variant === 'gradient'
      ? TEXT.onDark
      : disabled
      ? TEXT.muted
      : PALETTE.midnight;

  const inner = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={labelColour} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Txt variant="button" color={labelColour}>
            {label}
          </Txt>
        </>
      )}
    </View>
  );

  const shell: ViewStyle[] = [
    styles.base,
    compact ? styles.compact : styles.regular,
    isBlock && styles.block,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    !!disabled && variant !== 'ghost' && styles.disabled,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      style={({ pressed }) => [pressed && !inert && styles.pressed]}
    >
      {variant === 'gradient' && !disabled ? (
        <LinearGradient
          colors={[...GRADIENT.selected]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={shell}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={shell}>{inner}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regular: {
    minHeight: TOUCH_MIN,
    paddingHorizontal: SPACE.xl,
  },
  compact: {
    // Visual height can dip below 44, so callers get hitSlop from the parent row.
    minHeight: 36,
    paddingHorizontal: SPACE.md,
  },
  block: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: PALETTE.midnight,
    ...SHADOW.button,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.4,
    borderColor: PALETTE.midnight,
  },
  ghost: {
    paddingHorizontal: SPACE.xs,
    minHeight: 0,
  },
  disabled: {
    backgroundColor: SURFACE.disabled,
    borderColor: SURFACE.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
  },
  icon: {
    marginRight: 2,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
});
