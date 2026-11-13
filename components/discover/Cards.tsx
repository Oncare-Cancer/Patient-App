import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { Txt } from '@/components/ui';
import {
  cleanVideoTitle,
  shortDate,
  thumbUrl,
  type BlogCard as Blog,
  type Video,
} from '@/services/content';
import { PALETTE, RADIUS, SHADOW, SPACE, SURFACE, TEXT } from '@/constants/theme';

/** A full (16:9) video: thumbnail with a play mark, category, title, date. */
export function VideoCard({
  video,
  onPress,
  width,
}: {
  video: Video;
  onPress: () => void;
  /** Fixed width inside a horizontal rail; omit to fill. */
  width?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={video.title}
      style={({ pressed }) => [styles.videoCard, width ? { width } : null, pressed && styles.pressed]}
    >
      <View style={styles.thumbWrap}>
        <Image source={{ uri: thumbUrl(video.id, 'mqdefault') }} style={styles.thumb} />
        <View style={styles.play}>
          <Play size={16} color={PALETTE.white} fill={PALETTE.white} strokeWidth={0} />
        </View>
        <View style={styles.cat}>
          <Txt variant="helperSm" color={PALETTE.white} numberOfLines={1}>
            {video.category}
          </Txt>
        </View>
      </View>
      <View style={styles.videoMeta}>
        <Txt variant="bodyMedium" numberOfLines={2}>
          {cleanVideoTitle(video.title)}
        </Txt>
        <Txt variant="helperSm" color={TEXT.muted} script="latin">
          {shortDate(video.date)}
        </Txt>
      </View>
    </Pressable>
  );
}

/**
 * A short (9:16): tall, title over a gradient, the way a Shorts shelf reads.
 * Shorts are filmed vertically, so a 16:9 card would crop the speaker's face.
 */
export function ShortCard({
  video,
  onPress,
  width = 132,
}: {
  video: Video;
  onPress: () => void;
  width?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={video.title}
      style={({ pressed }) => [styles.shortCard, { width, height: (width * 16) / 9 }, pressed && styles.pressed]}
    >
      {/* YouTube serves shorts' thumbnails letterboxed 16:9; covering a 9:16
          frame keeps the centre, which is where the speaker is. */}
      <Image source={{ uri: thumbUrl(video.id, 'hqdefault') }} style={styles.shortThumb} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        style={styles.shortShade}
        pointerEvents="none"
      />
      <View style={styles.shortPlay}>
        <Play size={12} color={PALETTE.white} fill={PALETTE.white} strokeWidth={0} />
      </View>
      <Txt variant="helper" color={PALETTE.white} numberOfLines={3} style={styles.shortTitle}>
        {cleanVideoTitle(video.title)}
      </Txt>
    </Pressable>
  );
}

/** An article: image, title, two lines of summary, author and date. */
export function BlogRow({
  blog,
  onPress,
  compact = false,
}: {
  blog: Blog;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={blog.title}
      style={({ pressed }) => [styles.blogRow, pressed && styles.pressed]}
    >
      <Image source={{ uri: blog.img }} accessibilityLabel={blog.alt} style={compact ? styles.blogImgSm : styles.blogImg} />
      <View style={styles.blogMeta}>
        <Txt variant="bodyMedium" numberOfLines={compact ? 3 : 2}>
          {blog.title}
        </Txt>
        {!compact && blog.summary ? (
          <Txt variant="helperSm" color={TEXT.secondary} numberOfLines={2}>
            {blog.summary}
          </Txt>
        ) : null}
        <Txt variant="helperSm" color={TEXT.muted} numberOfLines={1}>
          {[blog.author.name, shortDate(blog.date)].filter(Boolean).join(' · ')}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88 },
  videoCard: {
    backgroundColor: SURFACE.card,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  thumbWrap: { aspectRatio: 16 / 9, backgroundColor: SURFACE.disabled },
  thumb: { width: '100%', height: '100%' },
  play: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: 'rgba(32,32,107,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  cat: {
    position: 'absolute',
    left: SPACE.xs,
    top: SPACE.xs,
    maxWidth: '70%',
    backgroundColor: 'rgba(32,32,107,0.82)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.xs,
    paddingVertical: 2,
  },
  videoMeta: { padding: SPACE.sm, gap: 2 },
  shortCard: { borderRadius: RADIUS.cardSm, overflow: 'hidden', backgroundColor: '#111' },
  shortThumb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  shortShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  shortPlay: {
    position: 'absolute',
    top: SPACE.xs,
    right: SPACE.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  shortTitle: { position: 'absolute', left: SPACE.xs, right: SPACE.xs, bottom: SPACE.sm },
  blogRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
    backgroundColor: SURFACE.card,
    borderRadius: RADIUS.card,
    padding: SPACE.sm,
    marginBottom: SPACE.sm,
    ...SHADOW.card,
  },
  blogImg: { width: 104, height: 78, borderRadius: RADIUS.chip, backgroundColor: SURFACE.disabled },
  blogImgSm: { width: 84, height: 63, borderRadius: RADIUS.chip, backgroundColor: SURFACE.disabled },
  blogMeta: { flex: 1, gap: 3 },
});
