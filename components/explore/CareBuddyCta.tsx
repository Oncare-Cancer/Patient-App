import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { GRADIENT, RADIUS, SPACE, TEXT } from '@/constants/theme';

/**
 * "Need guidance? Talk to our care buddy" — the website's cost-estimate block.
 *
 * Two routes out, because they are genuinely different asks: book a slot now,
 * or ask the team to call back with a cost estimate. The second is the normal
 * request flow (it lands in the same queue as every other service request), so
 * a patient who is not ready to commit to a time still reaches someone.
 */
export function CareBuddyCta({
  onBook,
  onRequest,
  /** Overrides the default heading, e.g. to name the doctor. */
  title,
  subtitle,
}: {
  onBook: () => void;
  onRequest: () => void;
  title?: string;
  subtitle?: string;
}) {
  const t = useT();

  return (
    <LinearGradient
      colors={[...GRADIENT.header]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Txt variant="title" color={TEXT.onDark} center>
        {title ?? t('ui.explore.careBuddyTitle')}
      </Txt>
      <Txt
        variant="helperSm"
        color={TEXT.onDarkMuted}
        center
        style={styles.sub}
      >
        {subtitle ?? t('ui.explore.careBuddyBody')}
      </Txt>

      {/*
        Stacked, not side by side.
        They shared a row at flex: 1 each, which gave "Request a callback" half
        the card width minus the pill's own padding — and since a Btn label is
        deliberately one line, it rendered as "Request a cal...". Hindi is
        longer still ("कॉल बैक का अनुरोध करें"), so widening the row or
        shrinking the padding only moves the point at which it breaks. Full
        width cannot truncate in any language.
      */}
      <View style={styles.actions}>
        <Btn label={t('ui.explore.bookNow')} onPress={onBook} />
        <Btn
          label={t('ui.explore.requestCallback')}
          variant="secondary"
          onDark
          onPress={onRequest}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    marginTop: SPACE.md,
    marginBottom: SPACE.md,
  },
  sub: { marginTop: SPACE.xxs, maxWidth: 320, alignSelf: 'center' },
  actions: {
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
});
