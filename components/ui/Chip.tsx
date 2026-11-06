import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from './Txt';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Count shown after the label, as on the Records category chips. */
  count?: number;
  disabled?: boolean;
  /** Pill (speciality / category filters) or square-ish (slots, dates). */
  shape?: 'pill' | 'box';
  style?: ViewStyle;
  /** Keeps Latin script for medical labels like "Tumour markers". */
  latin?: boolean;
};

/**
 * Filter chip and slot chip in one component.
 *
 * Selected state is the violet-to-pink gradient from section 03, which is the
 * single visual cue the design uses for "chosen" across chips, dates and slots —
 * so they share an implementation rather than three near-identical ones.
 */
export function Chip({
  label,
  selected,
  onPress,
  count,
  disabled,
  shape = 'pill',
  style,
  latin,
}: Props) {
  const radius = shape === 'pill' ? RADIUS.pill : RADIUS.chip;

  const content = (
    <View style={styles.inner}>
      <Txt
        variant="helper"
        script={latin ? 'latin' : 'auto'}
        color={
          disabled ? TEXT.muted : selected ? TEXT.onDark : PALETTE.midnight
        }
        style={disabled ? styles.struck : undefined}
      >
        {label}
      </Txt>
      {count !== undefined && (
        <Txt
          variant="helperSm"
          script="latin"
          color={selected ? 'rgba(255,255,255,0.8)' : TEXT.muted}
        >
          {count}
        </Txt>
      )}
    </View>
  );

  const shell = [
    styles.base,
    { borderRadius: radius },
    !selected && !disabled && styles.idle,
    disabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      hitSlop={6}
      style={({ pressed }) => [pressed && !disabled && styles.pressed]}
    >
      {selected && !disabled ? (
        <LinearGradient
          colors={[...GRADIENT.selected]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={shell}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={shell}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // Visual height stays at the design's 32; hitSlop above carries the touch
    // target to 44 without making the chips look oversized.
    minHeight: 32,
    paddingHorizontal: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: {
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  disabled: {
    backgroundColor: SURFACE.disabled,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
  },
  /** Booked slots are greyed AND struck through — issue #11. */
  struck: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.8,
  },
});

/** Minimum width so a row of slot chips lines up in a grid. */
export const SLOT_CHIP_MIN_WIDTH = (TOUCH_MIN * 3) / 2;
