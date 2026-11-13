import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Share2 } from 'lucide-react-native';
import {
  Accordion,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { BlockRenderer } from '@/components/discover/BlockRenderer';
import { BlogRow } from '@/components/discover/Cards';
import { ContentCta } from '@/components/discover/ContentCta';
import { useT } from '@/contexts/LanguageContext';
import { getBlog, shortDate, type Block, type BlogDetail } from '@/services/content';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/** FAQ answers arrive as blocks; the Accordion shows plain text. */
const blocksToText = (blocks: Block[]) =>
  blocks
    .map((b) =>
      'items' in b
        ? b.items.map((it) => `• ${it.map((s) => s.x).join('')}`).join('\n')
        : 's' in b
        ? b.s.map((s) => s.x).join('')
        : ''
    )
    .filter(Boolean)
    .join('\n\n');

/**
 * One article, rendered natively.
 *
 * Banner, title, "Written and verified by" with the doctor's photo and
 * experience, read time, the body, the article's own FAQs, then what to read
 * next. "Any query?" and "Book now" stay pinned at the bottom.
 */
export default function BlogScreen() {
  const t = useT();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = async () => {
    setState('loading');
    try {
      const b = await getBlog(String(slug));
      setBlog(b);
      setState(b ? 'ready' : 'error');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    void load();
    // Reloads when "Read next" swaps the slug on this same screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('ui.discover.articles')}
        actions={
          blog ? (
            <Pressable
              onPress={() => Share.share({ message: `${blog.title}\n${blog.url}` }).catch(() => {})}
              accessibilityRole="button"
              accessibilityLabel={t('ui.discover.share')}
              hitSlop={10}
              style={styles.share}
            >
              <Share2 size={16} color={TEXT.onDark} strokeWidth={2.2} />
            </Pressable>
          ) : undefined
        }
      />

      <Screen scrollResetKey={String(slug)}>
        {state === 'loading' ? (
          <SkeletonList count={6} lines={3} />
        ) : state === 'error' || !blog ? (
          <ErrorState onRetry={() => void load()} />
        ) : (
          <>
            <Image source={{ uri: blog.banner || blog.img }} accessibilityLabel={blog.alt} style={styles.banner} />
            <Txt variant="titleLg" style={styles.title}>
              {blog.title}
            </Txt>

            <View style={styles.byline}>
              {blog.author.img ? (
                <Image source={{ uri: blog.author.img }} style={styles.avatar} />
              ) : null}
              <View style={styles.flex}>
                <Txt variant="helperSm" color={TEXT.muted}>
                  {t('ui.discover.writtenBy')}
                </Txt>
                <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
                  {blog.author.name}
                </Txt>
                <Txt variant="helperSm" color={TEXT.secondary} numberOfLines={1}>
                  {[
                    blog.author.speciality,
                    blog.author.experience ? t('ui.discover.yearsExp', { years: blog.author.experience }) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Clock size={12} color={TEXT.muted} strokeWidth={2.2} />
              <Txt variant="helperSm" color={TEXT.muted}>
                {[t('ui.discover.readMin', { min: blog.readMin }), shortDate(blog.date)]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            </View>

            <BlockRenderer blocks={blog.blocks} />

            {blog.faqs.length ? (
              <View style={styles.section}>
                <Txt variant="section" style={styles.sectionTitle}>
                  {t('ui.explore.faqTitle')}
                </Txt>
                <Accordion items={blog.faqs.map((f) => ({ q: f.q, a: blocksToText(f.a) }))} />
              </View>
            ) : null}

            {blog.related.length ? (
              <View style={styles.section}>
                <Txt variant="section" style={styles.sectionTitle}>
                  {t('ui.discover.readNext')}
                </Txt>
                {blog.related.map((r) => (
                  <BlogRow
                    key={r.slug}
                    blog={r}
                    compact
                    onPress={() => router.setParams({ slug: r.slug } as never)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </Screen>

      {blog ? <ContentCta origin={{ type: 'blog', slug: blog.slug, title: blog.title }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  share: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    width: '100%',
    aspectRatio: 1200 / 630,
    borderRadius: RADIUS.card,
    backgroundColor: SURFACE.disabled,
  },
  title: { marginTop: SPACE.md, color: PALETTE.midnight },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
    padding: SPACE.sm,
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.info,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: SURFACE.disabled },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs, marginVertical: SPACE.md },
  section: { marginTop: SPACE.lg },
  sectionTitle: { marginBottom: SPACE.sm },
});
