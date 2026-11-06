import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { Txt } from './Txt';
import { PALETTE, RADIUS, SPACE, SPACE as S, TEXT } from '@/constants/theme';
import { useT } from '@/contexts/LanguageContext';

/**
 * The approximate-price disclaimer.
 *
 * Section 06 makes this a rule, not a decoration: it is "shown above every price
 * list", and each individual price additionally carries an "approx." label. Both
 * halves matter — the note explains why, the per-price label stops a patient who
 * skipped the note from reading a number as final.
 *
 * The copy sits in `legal.*`, so it stays English until Marketing/Legal sign off
 * on a Hindi version. A machine-translated pricing disclaimer is not something
 * to ship in a cancer app.
 */
export function PriceNote() {
  const t = useT();

  return (
    <View style={styles.wrap}>
      <Info size={13} color={PALETTE.purple} strokeWidth={2.2} />
      <Txt variant="helperSm" color={TEXT.secondary} style={styles.text}>
        {t('legal.approxPriceNote')}
      </Txt>
    </View>
  );
}

/**
 * A price with its mandatory "approx." label underneath.
 *
 * `value` is null when the catalogue has no usable price for the item — which is
 * common: 49% of lab items and 17% of medicines have no patient-facing price.
 * Those render as "Price on confirmation" rather than a zero, because a ₹0 next
 * to a cancer drug reads as free.
 */
export function ApproxPrice({
  value,
  align = 'right',
}: {
  value: number | null | undefined;
  align?: 'left' | 'right';
}) {
  const t = useT();
  const alignment = align === 'right' ? styles.right : styles.left;

  if (value === null || value === undefined || value <= 0) {
    return (
      <View style={alignment}>
        <Txt variant="helperSm" color={TEXT.muted} style={styles.pending}>
          {t('ui.medicine.priceOnConfirmation')}
        </Txt>
      </View>
    );
  }

  return (
    <View style={alignment}>
      <Txt variant="bodyMedium" script="latin">
        ₹{value.toLocaleString('en-IN')}
      </Txt>
      <Txt variant="helperSm" color={TEXT.muted}>
        {t('ui.common.approx')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: SPACE.xs,
    backgroundColor: '#F7F2FF',
    borderRadius: RADIUS.chip,
    padding: S.sm,
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  left: {
    alignItems: 'flex-start',
  },
  pending: {
    maxWidth: 104,
    textAlign: 'right',
  },
});
