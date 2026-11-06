import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Txt } from '@/components/ui/Txt';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SHADOW,
  SURFACE,
} from '@/constants/theme';

export type ServiceTile = {
  key: string;
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
};

/**
 * The "Care services" 3-across grid, shared by the signed-in home (A4) and the
 * guest home (B1).
 *
 * One component for both because the tiles are identical in treatment and only
 * differ in which six services they list — A4 shows Insurance Help and Order
 * Medicines, B1 swaps in Our Centres and the price lists.
 *
 * Tiles carry a border rather than a shadow: six elevated surfaces in a grid is
 * noticeably more expensive to composite on Android than six bordered ones, and
 * the design reads the same either way at this size.
 */
export function ServiceGrid({ tiles }: { tiles: ServiceTile[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map(({ key, label, Icon, onPress }) => (
        <Pressable
          key={key}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.icon}>
            <Icon size={17} color={PALETTE.purple} strokeWidth={2.1} />
          </View>
          <Txt variant="helperSm" center numberOfLines={2} style={styles.label}>
            {label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  tile: {
    // Three across, accounting for the two gaps between them.
    width: `${(100 - 7) / 3}%`,
    minHeight: 84,
    borderRadius: RADIUS.cardSm,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.xs,
    gap: SPACE.xs,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.85,
    backgroundColor: SURFACE.tint,
  },
});

const _shadowUnused = SHADOW;
