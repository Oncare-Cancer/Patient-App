import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Txt } from './Txt';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT, TOUCH_MIN } from '@/constants/theme';

/**
 * A question-and-answer list, one open at a time.
 *
 * NOT IN PDF — the mockups do not show FAQs, but the website's centre and
 * doctor pages both carry them and the content already exists in the CMS.
 *
 * Collapsed by default and single-expand: a centre has four long answers, and
 * showing them all turns the page into a wall of text the patient scrolls past.
 */
export function Accordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <View key={`${item.q}-${i}`} style={styles.row}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={styles.head}
            >
              <Txt variant="helper" style={styles.q}>
                {item.q}
              </Txt>
              {/* Rotating the chevron rather than swapping the icon keeps the
                  row height fixed as it opens. */}
              <ChevronDown
                size={16}
                color={isOpen ? PALETTE.purple : TEXT.muted}
                strokeWidth={2.4}
                style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
              />
            </Pressable>

            {isOpen ? (
              <Txt variant="bodySm" color={TEXT.secondary} style={styles.a}>
                {item.a}
              </Txt>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    overflow: 'hidden',
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
    paddingHorizontal: SPACE.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN + 6,
    paddingVertical: SPACE.sm,
  },
  q: { flex: 1 },
  a: {
    paddingBottom: SPACE.md,
    lineHeight: 20,
  },
});
