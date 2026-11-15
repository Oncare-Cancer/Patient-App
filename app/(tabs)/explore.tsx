import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2,
  ChevronRight,
  CircleHelp,
  MessageCircleQuestion,
  Stethoscope,
} from 'lucide-react-native';
import {
  Btn,
  Card,
  Screen,
  ScreenHeader,
  SectionRow,
  SkeletonCard,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { BlogRow, ShortCard, VideoCard } from '@/components/discover/Cards';
import { QuerySheet } from '@/components/discover/ContentCta';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { listBlogs, listVideos, type BlogCard, type Video } from '@/services/content';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Discover (was Explore).
 *
 * Educational content from oncarecancer.com, plus the centre and doctor
 * directory. Round 7 gave each tab one job: finding a doctor TO BOOK lives in
 * Book; this is for learning and browsing.
 *
 * Order: videos first (the library is large and the most watched), shorts as
 * a tall shelf, articles in the app's language, the directory, FAQs, and
 * "Any query?" last, for whoever got to the end without finding an answer.
 * Every article and video also ends in "Any query?" and "Book now".
 *
 * No testimonials or patient reviews are added here (advertising-guideline
 * caution); the content is educational.
 */
export default function Discover() {
  const t = useT();
  const router = useRouter();
  const { locale } = useLanguage();

  const [videos, setVideos] = useState<Video[] | null>(null);
  const [blogs, setBlogs] = useState<BlogCard[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const load = useCallback(async () => {
    // Independent: one failing must not hide the other.
    const [v, b] = await Promise.allSettled([
      listVideos(),
      // Articles in the language the patient reads the app in.
      listBlogs({ lang: locale === 'hi' ? 'hi' : 'en', limit: 4 }),
    ]);
    setVideos(v.status === 'fulfilled' ? v.value.videos : []);
    setBlogs(b.status === 'fulfilled' ? b.value.list : []);
    setRefreshing(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const full = (videos ?? []).filter((v) => !v.short).slice(0, 8);
  const shorts = (videos ?? []).filter((v) => v.short).slice(0, 12);

  const seeAll = (onPress: () => void) => (
    // Padding, not a hitSlop, and none below: a downward hitSlop reached over
    // the card rail under the heading, which is drawn later and so won the
    // tap - "See all" opened the first video instead.
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, left: 12, right: 12, bottom: 0 }}
      accessibilityRole="button"
      style={{ paddingVertical: 6, paddingLeft: 12 }}
    >
      <Txt variant="helper" color={PALETTE.purple}>
        {t('ui.discover.seeAll')}
      </Txt>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.discover.title')} subtitle={t('ui.discover.subtitle')} back={false} />

      <Screen
        withNav
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
        {/* ------------------------------------------------------- videos */}
        <SectionRow action={seeAll(() => router.push('/discover/videos' as never))}>
          <Txt variant="section">{t('ui.discover.videos')}</Txt>
        </SectionRow>
        {videos === null ? (
          <SkeletonCard lines={3} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            style={styles.bleed}
          >
            {full.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                width={240}
                onPress={() =>
                  router.push({ pathname: '/discover/video/[slug]', params: { slug: v.slug } } as never)
                }
              />
            ))}
          </ScrollView>
        )}

        {/* ------------------------------------------------------- shorts */}
        {shorts.length ? (
          <>
            <View style={styles.gap}>
              {/* The grid of shorts, not the player: "See all" is a list to choose
                  from, and the player started the first short on its own. */}
              <SectionRow
                action={seeAll(() =>
                  router.push({ pathname: '/discover/videos', params: { kind: 'short' } } as never)
                )}
              >
                <Txt variant="section">{t('ui.discover.shorts')}</Txt>
              </SectionRow>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              style={styles.bleed}
            >
              {shorts.map((v) => (
                <ShortCard
                  key={v.id}
                  video={v}
                  onPress={() =>
                    router.push({ pathname: '/discover/shorts', params: { start: v.slug } } as never)
                  }
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* ----------------------------------------------------- articles */}
        <View style={styles.gap}>
          <SectionRow action={seeAll(() => router.push('/discover/blogs' as never))}>
            <Txt variant="section">{t('ui.discover.articles')}</Txt>
          </SectionRow>
        </View>
        {blogs === null ? (
          <SkeletonList count={3} lines={2} />
        ) : (
          blogs.map((b) => (
            <BlogRow
              key={b.slug}
              blog={b}
              onPress={() =>
                router.push({ pathname: '/discover/blog/[slug]', params: { slug: b.slug } } as never)
              }
            />
          ))
        )}

        {/* ---------------------------------------------------- directory */}
        <View style={[styles.gap, styles.tiles]}>
          {[
            { key: 'centres', Icon: Building2, label: t('ui.discover.centres') },
            { key: 'doctors', Icon: Stethoscope, label: t('ui.discover.doctors') },
          ].map(({ key, Icon, label }) => (
            <Pressable
              key={key}
              onPress={() =>
                router.push({ pathname: '/discover/directory', params: { tab: key } } as never)
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <View style={styles.tileIcon}>
                <Icon size={18} color={PALETTE.purple} strokeWidth={2.2} />
              </View>
              <Txt variant="bodyMedium" style={styles.flex}>
                {label}
              </Txt>
              <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>

        {/* --------------------------------------------------------- FAQs */}
        <Pressable
          onPress={() => router.push('/profile/faq')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.gap, pressed && styles.pressed]}
        >
          <Card tone="info" style={styles.faq}>
            <View style={styles.tileIcon}>
              <CircleHelp size={18} color={PALETTE.midnight} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Txt variant="bodyMedium">{t('ui.discover.faqs')}</Txt>
              <Txt variant="helperSm" color={TEXT.secondary}>
                {t('ui.discover.faqsBody')}
              </Txt>
            </View>
            <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
          </Card>
        </Pressable>
        {/* ---------------------------------------------------- any query */}
        <Card tone="info" style={[styles.gap, styles.ask]}>
          <View style={styles.askTop}>
            <View style={styles.askIcon}>
              <MessageCircleQuestion size={18} color={PALETTE.white} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Txt variant="bodyMedium">{t('ui.discover.anyQuery')}</Txt>
              <Txt variant="helperSm" color={TEXT.secondary}>
                {t('ui.discover.queryBody')}
              </Txt>
            </View>
          </View>
          <Btn
            label={t('ui.discover.querySend')}
            compact
            onPress={() => setAskOpen(true)}
          />
        </Card>
      </Screen>

      <QuerySheet
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        origin={{ type: 'service', slug: 'discover', title: t('ui.discover.title') }}
        topic="discover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  pressed: { opacity: 0.88 },
  gap: { marginTop: SPACE.lg },
  // Rails run edge to edge; the first card still lines up with the gutter.
  bleed: { marginHorizontal: -SPACE.gutter },
  rail: { gap: SPACE.sm, paddingHorizontal: SPACE.gutter, paddingBottom: SPACE.xs },
  tiles: { flexDirection: 'row', gap: SPACE.sm },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    backgroundColor: SURFACE.card,
    borderRadius: RADIUS.card,
    padding: SPACE.sm,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faq: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  ask: { gap: SPACE.sm },
  askTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  askIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
