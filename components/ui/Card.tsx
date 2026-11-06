import React from 'react';
import { View, ViewProps, Pressable, StyleSheet } from 'react-native';
import { SURFACE, RADIUS, SHADOW, SPACE } from '@/constants/theme';

type Props = ViewProps & {
  /** `info` is the pale-blue helper card from the PDF; `plain` drops the shadow. */
  tone?: 'card' | 'info' | 'plain';
  /** Card radius. The PDF allows 16-20. */
  size?: 'sm' | 'md' | 'lg';
  /** Inner padding. Pass `false` when the card holds its own rows. */
  padded?: boolean;
  onPress?: () => void;
  /** Violet border + tint, used for the selected row in a list (C1, C2, G1). */
  selected?: boolean;
};

/**
 * White surface, 16-20 px radius, soft shadow — the base of nearly every block
 * in the redesign.
 *
 * Shadows are declared in constants/theme (SHADOW) rather than inline so the
 * deprecated `shadow*` props stay in one place; see the web note there.
 */
export function Card({
  tone = 'card',
  size = 'md',
  padded = true,
  selected,
  onPress,
  style,
  children,
  ...rest
}: Props) {
  const body = (
    <View
      {...rest}
      style={[
        styles.base,
        { borderRadius: size === 'sm' ? RADIUS.cardSm : size === 'lg' ? RADIUS.cardLg : RADIUS.card },
        tone === 'card' && styles.card,
        tone === 'info' && styles.info,
        tone === 'plain' && styles.plain,
        padded && styles.padded,
        selected && styles.selected,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: SURFACE.card,
  },
  card: SHADOW.card,
  info: {
    backgroundColor: SURFACE.info,
  },
  plain: {
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  padded: {
    padding: SPACE.md,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: '#9966FF',
    backgroundColor: SURFACE.tint,
  },
  pressed: {
    opacity: 0.85,
  },
});
