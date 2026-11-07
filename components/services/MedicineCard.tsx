import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Check, Pill, Plus } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import { ApproxPrice } from '@/components/ui/PriceNote';
import { useT } from '@/contexts/LanguageContext';
import type { Medicine } from '@/services/catalog';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * One medicine, in the browse list and in the search results.
 *
 * Shared by F1 (Order medicines) and B3 (the guest price list) so the two
 * cannot drift apart; `onAdd` is what separates them, since a guest has nothing
 * to add to.
 *
 * The information hierarchy is the whole point of this component. The previous
 * row put the raw catalogue string on the first line, which meant a patient
 * read "ADS - KEYTRUDA 100 MG / 4 ML - PEMBROLIZUMAB - A003901" and had to
 * find the part that matched their prescription inside a purchase order. Now:
 *
 *   line 1  brand, strength and form — what the prescription says
 *   line 2  molecule — what it actually is, when that differs
 *   line 3  how many brands this entry covers, on the grouped browse list
 *   below   price, as a range when the brands behind it are priced differently
 *
 * A price range rather than one number is deliberate: the same carboplatin is
 * ₹783 from one vendor and ₹3,720 from another, and the lower figure alone
 * would read as a quote.
 */
export function MedicineCard({
  medicine,
  onAdd,
  inCart = false,
}: {
  medicine: Medicine;
  /** Omit on the guest price list, which has nothing to add to. */
  onAdd?: () => void;
  /** Already in the cart — the action becomes "add another". */
  inCart?: boolean;
}) {
  const t = useT();
  const m = medicine;

  return (
    <Card tone="plain" style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.iconTile, inCart && styles.iconTileOn]}>
          {inCart ? (
            <Check size={15} color={PALETTE.white} strokeWidth={2.8} />
          ) : (
            <Pill size={15} color={PALETTE.purple} strokeWidth={2.2} />
          )}
        </View>

        <View style={styles.meta}>
          {/* Drug names stay Latin in both languages — see i18n/README. */}
          <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
            {m.displayName}
          </Txt>

          {m.genericName ? (
            <Txt
              variant="helperSm"
              color={TEXT.secondary}
              script="latin"
              numberOfLines={1}
            >
              {m.genericName}
            </Txt>
          ) : null}

          {m.brands && m.brands > 1 ? (
            <View style={styles.brandRow}>
              <View style={styles.brandChip}>
                <Txt variant="helperSm" color={PALETTE.purple} script="latin">
                  {t('ui.medicine.brandsAvailable', { count: m.brands })}
                </Txt>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.bottom}>
        <ApproxPrice value={m.price} to={m.priceTo ?? null} align="left" />

        {onAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={`${t('ui.medicine.add')} ${m.displayName}`}
            hitSlop={10}
            style={({ pressed }) => [
              styles.addBtn,
              inCart && styles.addBtnOn,
              pressed && styles.pressed,
            ]}
          >
            {inCart ? (
              <Plus size={13} color={PALETTE.white} strokeWidth={2.8} />
            ) : (
              <Plus size={13} color={PALETTE.midnight} strokeWidth={2.8} />
            )}
            <Txt
              variant="button"
              color={inCart ? TEXT.onDark : PALETTE.midnight}
              numberOfLines={1}
            >
              {inCart ? t('ui.medicine.addAnother') : t('ui.medicine.add')}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACE.xs,
    gap: SPACE.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileOn: {
    backgroundColor: PALETTE.purple,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  flex: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: 2,
  },
  brandChip: {
    backgroundColor: SURFACE.tint,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
    paddingTop: SPACE.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1.4,
    borderColor: PALETTE.midnight,
  },
  addBtnOn: {
    backgroundColor: PALETTE.midnight,
  },
  pressed: {
    opacity: 0.86,
  },
});
