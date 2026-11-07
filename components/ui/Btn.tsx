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
  /**
   * Red pill, only for confirming a destructive action (Logout, Cancel
   * appointment). Not in the PDF's button set, but the PDF has no confirm
   * dialog either, and "Logout" must not look identical to "Stay signed in".
   */
  | 'danger'
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
  /**
   * Inverts the `secondary` outline for use on a dark surface.
   *
   * The secondary variant outlines and labels in navy, which is invisible on
   * the navy gradient cards. This switches both to white.
   */
  onDark?: boolean;
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
  onDark,
  style,
}: Props) {
  const isBlock =
    block ??
    (variant === 'primary' || variant === 'secondary' || variant === 'danger');
  const inert = disabled || loading;

  const labelColour =
    variant === 'primary' || variant === 'gradient' || variant === 'danger'
      ? TEXT.onDark
      : disabled
      ? TEXT.muted
      : onDark
      ? TEXT.onDark
      : PALETTE.midnight;

  const inner = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={labelColour} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          {/* A button label is a single line by definition: wrapping one breaks
              the pill's height and reads as a layout fault. If it does not fit,
              it truncates and the label is too long for the button. */}
          <Txt variant="button" color={labelColour} numberOfLines={1}>
            {label}
          </Txt>
        </>
      )}
    </View>
  );

  /**
   * Visual styles only. The caller's `style` goes on the Pressable instead,
   * because it is the outer element and so the only one whose box the parent
   * layout can see: `flex: 1` or a margin set here had no effect at all, which
   * is why two buttons meant to share a row sat squeezed against the left edge.
   */
  const shell: ViewStyle[] = [
    styles.base,
    compact ? styles.compact : styles.regular,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'secondary' && onDark && styles.secondaryOnDark,
    variant === 'danger' && styles.danger,
    variant === 'ghost' && styles.ghost,
    !!disabled && variant !== 'ghost' && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      style={({ pressed }) => [
        isBlock && styles.block,
        style,
        pressed && !inert && styles.pressed,
      ]}
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
    // Fills whatever width the Pressable was given, so a `flex: 1` or stretched
    // button is a full-width pill rather than a content-sized one floating in a
    // wide tap area.
    alignSelf: 'stretch',
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
  /** Secondary on a navy surface: white outline and a faint white fill. */
  secondaryOnDark: {
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  danger: {
    backgroundColor: PALETTE.sosRed,
    ...SHADOW.button,
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
