import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import type { Centre } from '@/services/catalog';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * One centre in a list.
 *
 * The CMS has no short "area" field, and `name` is already the area as patients
 * use it ("Gurugram", "Kalyan Nagar"), so the name is the heading and the full
 * postal address is the second line. The row opens the centre's detail page;
 * directions and phone live there rather than being duplicated on every card.
 */
export function CentreCard({
  centre,
  onPress,
}: {
  centre: Centre;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${centre.name}, ${centre.address}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card tone="plain" style={styles.card}>
        <View style={styles.pin}>
          <MapPin size={16} color={PALETTE.purple} strokeWidth={2.2} />
        </View>
        <View style={styles.meta}>
          {/* Centre names and addresses are place data — Latin in both
              languages. */}
          <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
            {centre.name}
          </Txt>
          <Txt
            variant="helperSm"
            color={TEXT.muted}
            script="latin"
            numberOfLines={2}
            style={styles.address}
          >
            {centre.address}
          </Txt>
        </View>
        <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  address: { lineHeight: 16 },
  pressed: { opacity: 0.9 },
});
