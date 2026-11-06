import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { TYPE, TEXT, FONTS, FONTS_DEVANAGARI } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

export type TxtVariant = keyof typeof TYPE;

type Props = TextProps & {
  /** Type role from the PDF's type table. Defaults to `body`. */
  variant?: TxtVariant;
  /** Shorthand for colour; falls back to the variant's default. */
  color?: string;
  center?: boolean;
  /**
   * Force Latin (Montserrat) even in Hindi.
   *
   * Use for every medical token — drug names, strengths, test codes, dosage
   * notation. Those stay in Latin script in both languages (see
   * constants/i18n/README.md), and without this they would render in the
   * Devanagari face's Latin glyphs, which look wrong next to the rest of the UI.
   */
  script?: 'auto' | 'latin';
};

/** Maps a type role's family to the Devanagari equivalent of the same weight. */
const DEVA_FOR: Record<string, string> = {
  [FONTS.regular]: FONTS_DEVANAGARI.regular,
  [FONTS.medium]: FONTS_DEVANAGARI.medium,
  [FONTS.semibold]: FONTS_DEVANAGARI.semibold,
};

/**
 * Every piece of text in the app goes through this.
 *
 * Three reasons it exists rather than using <Text> with inline styles:
 *  - Montserrat only applies when `fontFamily` is set explicitly. A bare
 *    `fontWeight: '600'` silently does nothing on Android once a custom family
 *    is in play, which is how "the design looks off" bugs creep in.
 *  - It keeps the four type roles (title / section / body / helper) honest
 *    instead of drifting into a dozen ad-hoc sizes.
 *  - It switches to the Devanagari face in Hindi at the matching weight, so the
 *    language toggle does not need every screen to know about fonts.
 */
export function Txt({
  variant = 'body',
  color,
  center,
  script = 'auto',
  style,
  ...rest
}: Props) {
  const { devanagari } = useLanguage();
  const base = TYPE[variant];

  const fontFamily =
    devanagari && script === 'auto'
      ? DEVA_FOR[base.fontFamily] ?? base.fontFamily
      : base.fontFamily;

  return (
    <Text
      {...rest}
      style={[
        base,
        { fontFamily },
        // Devanagari sits lower and needs more room than Latin at the same point
        // size; without this, matras clip on tight line heights.
        devanagari && script === 'auto' && { lineHeight: base.lineHeight * 1.18 },
        { color: color ?? TEXT.primary },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
