import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { PALETTE } from '@/constants/theme';

/**
 * A YouTube video, played in the app through YouTube's own iframe.
 *
 * WHY AN IFRAME IN A WEBVIEW
 * It is the embed YouTube supports, so playback, captions and quality
 * switching all work, and nothing is downloaded or re-hosted. The page is
 * loaded with oncarecancer.com as its base URL because YouTube refuses to play
 * an embed that sends no referrer (it shows "video player configuration
 * error"), and the website is where these embeds already live.
 *
 * youtube-nocookie.com: the privacy-enhanced embed, which sets no tracking
 * cookies until the video is played.
 *
 * Any link inside the player (the YouTube logo, "Watch on YouTube") opens in
 * the YouTube app or browser instead of navigating the player away.
 */
export function YouTubePlayer({
  id,
  vertical = false,
  autoplay = false,
}: {
  id: string;
  /** Shorts are 9:16; full videos 16:9. */
  vertical?: boolean;
  autoplay?: boolean;
}) {
  const [loading, setLoading] = useState(true);

  const html = useMemo(() => {
    const qs = [
      'playsinline=1',
      'rel=0',
      'modestbranding=1',
      autoplay ? 'autoplay=1' : '',
      vertical ? 'loop=1&playlist=' + id : '',
    ]
      .filter(Boolean)
      .join('&');
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}
iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
<body><iframe src="https://www.youtube-nocookie.com/embed/${id}?${qs}"
allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
</body></html>`;
  }, [id, autoplay, vertical]);

  return (
    <View style={[styles.frame, vertical ? styles.vertical : styles.wide]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://www.oncarecancer.com' }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={!autoplay}
        onLoadEnd={() => setLoading(false)}
        // Keep the player on the embed; send anything else out to YouTube.
        onShouldStartLoadWithRequest={(req) => {
          const url = req.url;
          if (
            url.startsWith('about:') ||
            url.startsWith('https://www.oncarecancer.com') ||
            /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//.test(url) ||
            !req.isTopFrame
          ) {
            return true;
          }
          Linking.openURL(url).catch(() => {});
          return false;
        }}
      />
      {loading ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={PALETTE.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  wide: { aspectRatio: 16 / 9 },
  vertical: { flex: 1 },
  web: { flex: 1, backgroundColor: '#000' },
  loader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
