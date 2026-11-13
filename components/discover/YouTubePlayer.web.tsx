import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Web build of YouTubePlayer (Expo picks this file on web).
 *
 * react-native-webview has no web implementation - it renders a red "does not
 * support this platform" line over a black box - and on web there is no need
 * for one: the page can hold YouTube's iframe directly. Same embed, same
 * parameters as the native player.
 */
export function YouTubePlayer({
  id,
  vertical = false,
  autoplay = false,
}: {
  id: string;
  vertical?: boolean;
  autoplay?: boolean;
}) {
  const qs = [
    'playsinline=1',
    'rel=0',
    'modestbranding=1',
    // Browsers only allow autoplay with sound off.
    autoplay ? 'autoplay=1&mute=1' : '',
    vertical ? `loop=1&playlist=${id}` : '',
  ]
    .filter(Boolean)
    .join('&');

  return (
    <View style={[styles.frame, vertical ? styles.vertical : styles.wide]}>
      {React.createElement('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${id}?${qs}`,
        title: 'YouTube video',
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: true,
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  wide: { aspectRatio: 16 / 9 },
  vertical: { flex: 1 },
});
