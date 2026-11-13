import React, { useEffect, useMemo, useState } from 'react';
import { View, Linking, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import { ErrorState, Screen, ScreenHeader, SkeletonList, Txt } from '@/components/ui';
import { YouTubePlayer } from '@/components/discover/YouTubePlayer';
import { VideoCard } from '@/components/discover/Cards';
import { ContentCta } from '@/components/discover/ContentCta';
import { useT } from '@/contexts/LanguageContext';
import { cleanVideoTitle, listVideos, shortDate, type Video } from '@/services/content';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * One full video, played in the app (YouTube's iframe), with its description
 * and more from the same category. A short opened by slug goes to the tall
 * shorts viewer instead.
 */
export default function VideoScreen() {
  const t = useT();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listVideos()
      .then((r) => setVideos(r.videos))
      .catch(() => setFailed(true));
  }, []);

  const video = videos?.find((v) => v.slug === slug) ?? null;

  useEffect(() => {
    if (video?.short) {
      router.replace({ pathname: '/discover/shorts', params: { start: video.slug } } as never);
    }
  }, [video, router]);

  const more = useMemo(
    () =>
      (videos ?? [])
        .filter((v) => !v.short && v.slug !== slug && v.category === video?.category)
        .slice(0, 6),
    [videos, slug, video]
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title={video?.category || t('ui.discover.videos')} />

      {video && !video.short ? (
        // Outside the scroll view: the player stays put while the patient
        // reads the description or picks the next video.
        <YouTubePlayer key={video.id} id={video.id} autoplay />
      ) : null}

      <Screen scrollResetKey={String(slug)}>
        {failed ? (
          <ErrorState onRetry={() => router.replace({ pathname: '/discover/video/[slug]', params: { slug } } as never)} />
        ) : !video ? (
          <SkeletonList count={3} lines={2} />
        ) : (
          <>
            <Txt variant="title" style={styles.title}>
              {cleanVideoTitle(video.title)}
            </Txt>
            <Txt variant="helperSm" color={TEXT.muted} script="latin">
              {[video.category, shortDate(video.date)].filter(Boolean).join(' · ')}
            </Txt>
            {video.desc ? (
              <Txt variant="body" color={TEXT.secondary} style={styles.desc}>
                {video.desc}
              </Txt>
            ) : null}
            <Pressable
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`).catch(() => {})}
              accessibilityRole="link"
              style={styles.yt}
            >
              <ExternalLink size={13} color={PALETTE.deepBlue} strokeWidth={2.2} />
              <Txt variant="helper" color={PALETTE.deepBlue}>
                {t('ui.explore.watchOnYoutube')}
              </Txt>
            </Pressable>

            {more.length ? (
              <View style={styles.more}>
                <Txt variant="section" style={styles.moreTitle}>
                  {t('ui.discover.moreVideos')}
                </Txt>
                {more.map((v) => (
                  <View key={v.id} style={styles.moreItem}>
                    <VideoCard
                      video={v}
                      onPress={() => router.setParams({ slug: v.slug } as never)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </Screen>

      {video ? (
        <ContentCta origin={{ type: 'video', slug: video.slug, title: cleanVideoTitle(video.title) }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  title: { color: PALETTE.midnight, marginBottom: SPACE.xxs },
  desc: { marginTop: SPACE.sm },
  yt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
    marginTop: SPACE.sm,
    alignSelf: 'flex-start',
    paddingVertical: SPACE.xxs,
    borderRadius: RADIUS.pill,
  },
  more: { marginTop: SPACE.lg },
  moreTitle: { marginBottom: SPACE.sm },
  moreItem: { marginBottom: SPACE.md },
});
