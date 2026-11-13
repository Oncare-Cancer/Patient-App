import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, ChevronsUp } from 'lucide-react-native';
import { Txt } from '@/components/ui';
import { YouTubePlayer } from '@/components/discover/YouTubePlayer';
import { ContentCta } from '@/components/discover/ContentCta';
import { useT } from '@/contexts/LanguageContext';
import { cleanVideoTitle, listVideos, thumbUrl, type Video } from '@/services/content';
import { PALETTE, SPACE } from '@/constants/theme';

/**
 * Shorts, full screen and vertical: swipe up for the next, like YouTube Shorts
 * and Reels, because that is how people already know to watch them.
 *
 * Only the short on screen has a live player. Every other page is a still
 * thumbnail, so swiping through twenty shorts never runs twenty WebViews - the
 * player mounts when a page settles and unmounts when it leaves.
 */
export default function Shorts() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const params = useLocalSearchParams<{ start?: string; category?: string }>();

  const [shorts, setShorts] = useState<Video[]>([]);
  const [active, setActive] = useState(0);
  /** Where the pager opens; fixed once the list arrives. */
  const [startIndex, setStartIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hint, setHint] = useState(true);
  const listRef = useRef<FlatList<Video>>(null);

  useEffect(() => {
    listVideos()
      .then(({ videos }) => {
        const list = videos.filter(
          (v) => v.short && (!params.category || params.category === 'all' || v.category === params.category)
        );
        const start = Math.max(0, list.findIndex((v) => v.slug === params.start));
        setShorts(list);
        setStartIndex(start);
        setActive(start);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    // Read once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null; isViewable: boolean }[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) {
      setActive(first.index);
      if (first.index > 0) setHint(false);
    }
  }).current;

  const viewability = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  const current = shorts[active];

  const renderItem = useCallback(
    ({ item, index }: { item: Video; index: number }) => (
      <View style={{ width, height, backgroundColor: '#000' }}>
        {index === active ? (
          <YouTubePlayer key={item.id} id={item.id} vertical autoplay />
        ) : (
          <Image source={{ uri: thumbUrl(item.id, 'hqdefault') }} style={styles.still} resizeMode="cover" />
        )}
      </View>
    ),
    [active, height, width]
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Mounted once the list is here, so it can open on the tapped short with
          initialScrollIndex. Scrolling to it afterwards raced the first render:
          on web the list still had no items and threw "scrollToIndex out of
          range". */}
      {loaded && shorts.length ? (
        <FlatList
          ref={listRef}
          data={shorts}
          initialScrollIndex={startIndex}
          keyExtractor={(v) => v.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={height}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewability}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          onScrollToIndexFailed={() => {}}
        />
      ) : !loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PALETTE.white} />
        </View>
      ) : null}

      {/* Back, over the video. */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('ui.common.back')}
        hitSlop={12}
        style={[styles.back, { top: insets.top + SPACE.sm }]}
      >
        <ChevronLeft size={22} color={PALETTE.white} strokeWidth={2.4} />
      </Pressable>

      {/* Title and the two actions, over a shade so they read on any frame. */}
      {current ? (
        <View style={styles.bottom} pointerEvents="box-none">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.shade}
            pointerEvents="none"
          />
          <View style={styles.caption} pointerEvents="none">
            <Txt variant="bodyMedium" color={PALETTE.white} numberOfLines={3}>
              {cleanVideoTitle(current.title)}
            </Txt>
            {hint && shorts.length > 1 ? (
              <View style={styles.hint}>
                <ChevronsUp size={14} color="rgba(255,255,255,0.8)" strokeWidth={2.2} />
                <Txt variant="helperSm" color="rgba(255,255,255,0.8)">
                  {t('ui.discover.swipeUp')}
                </Txt>
              </View>
            ) : null}
          </View>
          <ContentCta
            dark
            origin={{ type: 'video', slug: current.slug, title: cleanVideoTitle(current.title) }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  still: { width: '100%', height: '100%', opacity: 0.85 },
  back: {
    position: 'absolute',
    left: SPACE.gutter,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 },
  caption: { paddingHorizontal: SPACE.gutter, paddingBottom: SPACE.sm, gap: SPACE.xs },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
