import React from 'react';
import { View, Image, ScrollView, StyleSheet, Linking, Text } from 'react-native';
import { Txt } from '@/components/ui';
import { YouTubePlayer } from '@/components/discover/YouTubePlayer';
import type { Block, Span } from '@/services/content';
import { FONTS, PALETTE, RADIUS, SPACE, SURFACE, TEXT, TYPE } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * An article body, from the backend's native blocks.
 *
 * Every block maps to the app's own components, so an article reads in the
 * app's type, spacing and - for Hindi articles - the Devanagari face, not as a
 * web page in a frame. Text is plain strings; nothing is parsed or executed.
 */

/** Inline spans inside a paragraph, heading or list item. */
function Spans({ spans, style }: { spans: Span[]; style?: object }) {
  const { devanagari } = useLanguage();
  // Article text can be Hindi regardless of the app language, so the face is
  // chosen by the text itself.
  const isDeva = devanagari || spans.some((s) => /[\u0900-\u097F]/.test(s.x));
  const regular = isDeva ? 'NotoSansDevanagari-Regular' : FONTS.regular;
  const bold = isDeva ? 'NotoSansDevanagari-SemiBold' : FONTS.semibold;
  return (
    <Text style={[styles.text, { fontFamily: regular }, style]}>
      {spans.map((s, i) => (
        <Text
          key={i}
          style={[
            s.b ? { fontFamily: bold } : null,
            s.i ? styles.italic : null,
            s.href ? styles.link : null,
          ]}
          onPress={s.href ? () => Linking.openURL(s.href!).catch(() => {}) : undefined}
          suppressHighlighting
        >
          {s.x}
        </Text>
      ))}
    </Text>
  );
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <View>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return <Spans key={i} spans={b.s} style={styles.p} />;
          case 'h':
            return (
              <Spans
                key={i}
                spans={b.s.map((s) => ({ ...s, b: 1 as const }))}
                style={b.level <= 2 ? styles.h2 : b.level === 3 ? styles.h3 : styles.h4}
              />
            );
          case 'ul':
          case 'ol':
            return (
              <View key={i} style={styles.list}>
                {b.items.map((item, j) => (
                  <View key={j} style={styles.li}>
                    <Txt variant="body" color={PALETTE.purple} script="latin" style={styles.bullet}>
                      {b.t === 'ol' ? `${j + 1}.` : '•'}
                    </Txt>
                    <Spans spans={item} style={styles.liText} />
                  </View>
                ))}
              </View>
            );
          case 'table':
            return (
              // Tables are wider than a phone; they scroll sideways rather
              // than squeezing columns to one word each.
              <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrap}>
                <View style={styles.table}>
                  {b.head.length ? (
                    <View style={[styles.tr, styles.thead]}>
                      {b.head.map((c, k) => (
                        <Txt key={k} variant="helper" style={styles.td}>
                          {c}
                        </Txt>
                      ))}
                    </View>
                  ) : null}
                  {b.rows.map((r, k) => (
                    <View key={k} style={[styles.tr, k % 2 === 1 && styles.zebra]}>
                      {r.map((c, m) => (
                        <Txt key={m} variant="bodySm" style={styles.td}>
                          {c}
                        </Txt>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          case 'img':
            return (
              <Image
                key={i}
                source={{ uri: b.src }}
                accessibilityLabel={b.alt}
                style={styles.img}
                resizeMode="cover"
              />
            );
          case 'video':
            return (
              <View key={i} style={styles.video}>
                <YouTubePlayer id={b.id} />
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: TEXT.primary, fontSize: TYPE.body.fontSize, lineHeight: 24 },
  italic: { fontStyle: 'italic' },
  link: { color: PALETTE.deepBlue, textDecorationLine: 'underline' },
  p: { marginBottom: SPACE.md },
  h2: { fontSize: 19, lineHeight: 26, marginTop: SPACE.md, marginBottom: SPACE.sm, color: PALETTE.midnight },
  h3: { fontSize: 17, lineHeight: 24, marginTop: SPACE.sm, marginBottom: SPACE.xs, color: PALETTE.midnight },
  h4: { fontSize: 15, lineHeight: 22, marginTop: SPACE.xs, marginBottom: SPACE.xs },
  list: { marginBottom: SPACE.md, gap: SPACE.xs },
  li: { flexDirection: 'row', gap: SPACE.xs },
  bullet: { width: 18, lineHeight: 24 },
  liText: { flex: 1 },
  tableWrap: { marginBottom: SPACE.md },
  table: { borderWidth: 1, borderColor: SURFACE.border, borderRadius: RADIUS.chip, overflow: 'hidden' },
  tr: { flexDirection: 'row' },
  thead: { backgroundColor: SURFACE.tint },
  zebra: { backgroundColor: SURFACE.info },
  td: { width: 170, padding: SPACE.sm },
  img: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.cardSm, marginBottom: SPACE.md, backgroundColor: SURFACE.disabled },
  video: { borderRadius: RADIUS.cardSm, overflow: 'hidden', marginBottom: SPACE.md },
});
