import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clapperboard } from 'lucide-react-native';
import {
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { ShortCard, VideoCard } from '@/components/discover/Cards';
import { useT } from '@/contexts/LanguageContext';
import { listVideos, type Video } from '@/services/content';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * The video library, as https://www.oncarecancer.com/videos/ organises it:
 * Full videos or Shorts, and the same seven categories.
 *
 * The library is ~400 videos. It arrives in one small response (cached), but
 * is rendered a page at a time as the patient scrolls, so the screen never
 * mounts hundreds of cards and their thumbnails at once.
 */
const PAGE = 12;

export default function Videos() {
  const t = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ kind?: string }>();

  const [kind, setKind] = useState<'full' | 'short'>(params.kind === 'short' ? 'short' : 'full');
  const [category, setCategory] = useState('all');
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [visible, setVisible] = useState(PAGE);

  const load = async () => {
    setState('loading');
    try {
      const res = await listVideos();
      setVideos(res.videos);
      setCategories(res.categories);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const shown = useMemo(
    () =>
      videos.filter(
        (v) => (kind === 'short' ? v.short : !v.short) && (category === 'all' || v.category === category)
      ),
    [videos, kind, category]
  );

  // A new filter starts from the first page again.
  useEffect(() => {
    setVisible(PAGE);
  }, [kind, category]);

  const page = shown.slice(0, visible);

  const counts = useMemo(
    () => ({ full: videos.filter((v) => !v.short).length, short: videos.filter((v) => v.short).length }),
    [videos]
  );

  // Two tall shorts per row, filling the gutters.
  const shortWidth = (width - SPACE.gutter * 2 - SPACE.sm) / 2;

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.discover.videos')} />
      <Screen
        scrollResetKey={`${kind}-${category}`}
        onEndReached={() => {
          if (visible < shown.length) setVisible((n) => n + PAGE);
        }}
      >
        <View style={styles.tabs}>
          {(['full', 'short'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: kind === k }}
              style={[styles.tab, kind === k && styles.tabOn]}
            >
              <Txt variant="helper" color={kind === k ? PALETTE.midnight : TEXT.muted}>
                {k === 'full' ? t('ui.discover.fullVideos') : t('ui.discover.shorts')}
                {state === 'ready' ? ` · ${counts[k]}` : ''}
              </Txt>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.bleed}
        >
          <Chip label={t('ui.records.all')} selected={category === 'all'} onPress={() => setCategory('all')} />
          {categories.map((c) => (
            <Chip key={c} label={c} latin selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        {state === 'loading' ? (
          <SkeletonList count={4} lines={3} />
        ) : state === 'error' ? (
          <ErrorState onRetry={() => void load()} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<Clapperboard size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.discover.noVideos')}
          />
        ) : kind === 'short' ? (
          <View style={styles.grid}>
            {page.map((v) => (
              <ShortCard
                key={v.id}
                video={v}
                width={shortWidth}
                onPress={() =>
                  router.push({
                    pathname: '/discover/shorts',
                    params: { start: v.slug, category },
                  } as never)
                }
              />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {page.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                onPress={() =>
                  router.push({ pathname: '/discover/video/[slug]', params: { slug: v.slug } } as never)
                }
              />
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  tabs: {
    flexDirection: 'row',
    backgroundColor: SURFACE.disabled,
    borderRadius: 12,
    padding: 3,
    marginBottom: SPACE.sm,
  },
  tab: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: SURFACE.card },
  bleed: { marginHorizontal: -SPACE.gutter, marginBottom: SPACE.md },
  chips: { gap: SPACE.xs, paddingHorizontal: SPACE.gutter },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  list: { gap: SPACE.md },
});
