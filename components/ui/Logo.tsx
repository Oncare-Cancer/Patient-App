import React from 'react';
import { Image, StyleSheet, type ImageStyle } from 'react-native';

/**
 * The Oncare lockup: violet ribbon mark plus the white "oncare" wordmark.
 *
 * Bundled from assets rather than fetched from the CMS URL that
 * `constants/theme.ts` exposes, so the first screen a patient sees does not
 * depend on the network — the login hero would otherwise render an empty gap on
 * a cold start with no signal.
 *
 * The wordmark is white, so this only reads correctly on the navy header. Every
 * screen in the redesign that shows the logo (A1, A3, A4, B1, H4) puts it on
 * navy, so no dark variant is needed. If one ever is, add a second asset rather
 * than tinting this one.
 *
 * Section 19 still lists an SVG as an open item. At the sizes used here the PNG
 * is a 616x164 source rendering into at most ~120 px wide, so it is sharp
 * enough; swap the require() when Design ships the vector.
 */

const SOURCE = require('../../assets/images/oncare-logo.png');

/** Intrinsic 616 x 164. */
const ASPECT = 616 / 164;

export function Logo({
  height = 22,
  style,
}: {
  height?: number;
  style?: ImageStyle;
}) {
  return (
    <Image
      source={SOURCE}
      // resizeMode as a prop, not in style — issue #2 flags the style form as
      // deprecated.
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Oncare"
      style={[{ height, width: height * ASPECT }, style]}
    />
  );
}

const _unused = StyleSheet.create({});
