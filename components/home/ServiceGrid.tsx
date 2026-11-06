import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Txt } from '@/components/ui/Txt';
import { PALETTE, RADIUS, SPACE, SURFACE } from '@/constants/theme';

export type ServiceTile = {
  key: string;
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
};

/** Percentage width for one tile, leaving `gap` between columns. */
const GAP_PERCENT = 3.5;
const widthFor = (columns: number) =>
  `${(100 - GAP_PERCENT * (columns - 1)) / columns}%` as const;

/**
 * The "Care services" grid, shared by the signed-in home (A4) and the guest
 * home (B1).
 *
 * The column count adapts to how many tiles there are: four or fewer get a 2x2
 * layout with large tiles, more than that fall back to three across. The
 * signed-in home now lists four services, and four tiles stretched across three
 * columns left an awkward single tile on the second row.
 *
 * Tiles carry a border rather than a shadow: several elevated surfaces in a grid
 * is noticeably more expensive to composite on Android than bordered ones, and
 * the design reads the same either way at this size.
 */
export function ServiceGrid({
  tiles,
  /** Overrides the automatic choice, if a screen needs a specific layout. */
  columns,
}: {
  tiles: ServiceTile[];
  columns?: 2 | 3;
}) {
  const cols = columns ?? (tiles.length <= 4 ? 2 : 3);
  const big = cols === 2;

  return (
    <View style={styles.grid}>
      {tiles.map(({ key, label, Icon, onPress }) => (
        <Pressable
          key={key}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            styles.tile,
            { width: widthFor(cols) },
            big && styles.tileBig,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.icon, big && styles.iconBig]}>
            <Icon
              size={big ? 22 : 17}
              color={PALETTE.purple}
              strokeWidth={2.1}
            />
          </View>
          <Txt
            variant={big ? 'helper' : 'helperSm'}
            center
            numberOfLines={2}
            style={big ? styles.labelBig : styles.label}
          >
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
  tileBig: {
    minHeight: 112,
    borderRadius: RADIUS.card,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.sm,
    gap: SPACE.sm,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBig: {
    width: 46,
    height: 46,
    borderRadius: 15,
  },
  label: {
    lineHeight: 14,
  },
  labelBig: {
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
    backgroundColor: SURFACE.tint,
  },
});
