import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus, Sparkles, X } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import { ApproxPrice } from '@/components/ui/PriceNote';
import { useT } from '@/contexts/LanguageContext';
import type { MatchStatus, RequestLine } from '@/services/requests';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * A cart row for medicines (F2/F3) and a selected test row for labs (G2/G3).
 *
 * The important behaviour is what it does with `matchStatus`. Anything other
 * than `matched` still sits in the cart and still submits — it just carries a
 * note saying who will resolve it. Half the lab catalogue has no price and some
 * items are not in it at all, so "we could not price this" has to look like a
 * normal state rather than a failure.
 *
 * `strengthMismatch` gets the loudest treatment, in amber. Searching
 * "Dexamethasone" returns the 8 mg row first when the prescription said 4 mg,
 * and a quietly wrong strength is the one error in this flow that could harm
 * someone.
 */

const TONE: Record<MatchStatus, { fill: string; text: string } | null> = {
  matched: null,
  ambiguous: { fill: '#F1E9FF', text: '#5B21B6' },
  strengthMismatch: { fill: '#FEF3E2', text: '#9A3412' },
  unpriced: { fill: '#F1F0F6', text: '#5A5A7A' },
  unmatched: { fill: '#F1F0F6', text: '#5A5A7A' },
};

function noteKey(status: MatchStatus): string | null {
  switch (status) {
    case 'ambiguous':
      return 'ui.match.ambiguous';
    case 'strengthMismatch':
      return 'ui.match.strengthMismatch';
    case 'unpriced':
      return 'ui.match.unpriced';
    case 'unmatched':
      return 'ui.match.unmatched';
    default:
      return null;
  }
}

export function CartLine({
  line,
  onQuantity,
  onRemove,
  showQuantity = true,
}: {
  line: RequestLine;
  /** Omit to render without steppers, as on the lab review list. */
  onQuantity?: (next: number) => void;
  onRemove?: () => void;
  showQuantity?: boolean;
}) {
  const t = useT();
  const tone = TONE[line.matchStatus];
  const note = noteKey(line.matchStatus);
  const qty = line.quantity ?? 1;

  return (
    <Card tone="plain" style={styles.card}>
      <View style={styles.top}>
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            {/* Drug and test names stay Latin in both languages. */}
            <Txt variant="bodyMedium" script="latin" numberOfLines={2} style={styles.flex}>
              {[line.name, line.strength].filter(Boolean).join(' ')}
            </Txt>
            {line.fromPrescription ? (
              <View style={styles.aiTag}>
                <Sparkles size={9} color={PALETTE.white} strokeWidth={2.6} />
              </View>
            ) : null}
          </View>

          {note ? (
            <View style={[styles.note, { backgroundColor: tone?.fill }]}>
              <Txt variant="helperSm" color={tone?.text}>
                {t(note as never)}
              </Txt>
            </View>
          ) : null}
        </View>

        <ApproxPrice value={line.approxPrice ?? null} />

        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${line.name}`}
            hitSlop={12}
            style={styles.remove}
          >
            <X size={15} color={TEXT.muted} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {showQuantity && onQuantity ? (
        <View style={styles.qtyRow}>
          <Pressable
            onPress={() => onQuantity(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            hitSlop={8}
            style={[styles.step, qty <= 1 && styles.stepOff]}
          >
            <Minus
              size={13}
              color={qty <= 1 ? TEXT.muted : PALETTE.midnight}
              strokeWidth={2.6}
            />
          </Pressable>

          <Txt variant="bodyMedium" script="latin" style={styles.qty}>
            {qty}
          </Txt>

          <Pressable
            onPress={() => onQuantity(qty + 1)}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            hitSlop={8}
            style={styles.step}
          >
            <Plus size={13} color={PALETTE.midnight} strokeWidth={2.6} />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACE.xs,
    gap: SPACE.xs,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
  },
  meta: {
    flex: 1,
    gap: SPACE.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  flex: {
    flex: 1,
  },
  aiTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PALETTE.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  remove: {
    padding: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    alignSelf: 'flex-start',
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: {
    backgroundColor: SURFACE.disabled,
  },
  qty: {
    minWidth: 20,
    textAlign: 'center',
  },
});

const _touch = TOUCH_MIN;
