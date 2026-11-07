import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { CentreReview } from '@/services/doctors';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/** Two initials for the avatar, e.g. "sudeep bhardwaj" -> "SB". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || '—').toUpperCase();
}

/** How much of a review is shown before "Read more". */
const CLAMP_LINES = 4;

/**
 * One patient review, as the website's centre page shows them.
 *
 * These come from Google via the CMS, so the name is a real person's and the
 * text is their words — rendered verbatim, never trimmed or tidied. Long
 * reviews are clamped with an explicit expand rather than cut off, because a
 * review that ends mid-sentence reads as broken.
 */
export function ReviewCard({ review }: { review: CentreReview }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card tone="plain" style={styles.card}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Txt variant="helperSm" color={PALETTE.midnight} script="latin">
            {initials(review.name)}
          </Txt>
        </View>
        <View style={styles.flex}>
          {/* A patient's own name and words — Latin in both languages. */}
          <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
            {review.name}
          </Txt>
          {review.stars > 0 ? (
            <View
              style={styles.stars}
              accessibilityLabel={t('ui.explore.starsOf5', {
                stars: review.stars,
              })}
            >
              {Array.from({ length: Math.min(review.stars, 5) }).map((_, i) => (
                <Star key={i} size={11} color="#F5A623" fill="#F5A623" />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <Txt
        variant="bodySm"
        color={TEXT.secondary}
        script="latin"
        numberOfLines={expanded ? undefined : CLAMP_LINES}
        style={styles.body}
      >
        {review.review}
      </Txt>

      {/* Only offered when there is plausibly more to show. */}
      {!expanded && review.review.length > 190 ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Txt variant="helperSm" color={PALETTE.deepBlue} style={styles.more}>
            {t('ui.explore.readMore')}
          </Txt>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACE.sm, gap: SPACE.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  flex: { flex: 1 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: { flexDirection: 'row', gap: 1, marginTop: 1 },
  body: { lineHeight: 19 },
  more: { textDecorationLine: 'underline' },
});
