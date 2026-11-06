import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import { Txt } from './Txt';
import { useLanguage } from '@/contexts/LanguageContext';
import { LOCALES, type Locale } from '@/constants/i18n';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * Two presentations of the same choice:
 *
 *  - `segmented` sits on the login hero (A1). Not in the PDF — it was added so a
 *    patient can switch before reading anything, which is the one moment the
 *    setting matters most. A Profile-only toggle assumes they can already read
 *    the English nav to get there.
 *  - `rows` is the Profile list item (D3, Preferences → Language).
 *
 * Labels are always in their own script, never translated. "हिन्दी" reads as
 * Hindi to a Hindi speaker whatever the current locale is; "Hindi" written in
 * English does not help the person who needs it.
 */

export function LanguageSegmented({ onDark }: { onDark?: boolean }) {
  const { locale, setLocale } = useLanguage();

  return (
    <View style={[styles.segment, onDark && styles.segmentOnDark]}>
      {LOCALES.map((l) => {
        const active = l.code === locale;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLocale(l.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={l.label}
            hitSlop={6}
            style={[
              styles.segmentItem,
              active && (onDark ? styles.segmentActiveOnDark : styles.segmentActive),
            ]}
          >
            <Txt
              variant="helper"
              script="latin"
              color={
                active
                  ? onDark
                    ? PALETTE.midnight
                    : PALETTE.white
                  : onDark
                  ? TEXT.onDarkMuted
                  : TEXT.secondary
              }
              style={l.code === 'hi' ? styles.nativeLabel : undefined}
            >
              {l.nativeLabel}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LanguageRows() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <View>
      {LOCALES.map((l, i) => {
        const active = l.code === locale;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLocale(l.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.row,
              i > 0 && styles.rowDivider,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowIcon}>
              <Globe size={17} color={PALETTE.midnight} strokeWidth={2} />
            </View>
            <View style={styles.rowText}>
              {/* Rendered with the target script's own face, so the patient sees
                  what the app will actually look like before committing. */}
              <Txt variant="bodyMedium" script={l.code === 'hi' ? 'auto' : 'latin'}>
                {l.nativeLabel}
              </Txt>
              <Txt variant="helperSm" color={TEXT.muted} script="latin">
                {l.label}
              </Txt>
            </View>
            {active ? (
              <Check size={18} color={PALETTE.purple} strokeWidth={2.6} />
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </Pressable>
        );
      })}
      <Txt variant="helperSm" color={TEXT.muted} style={styles.footnote}>
        {t('ui.language.subtitle')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: SURFACE.disabled,
    borderRadius: RADIUS.pill,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segmentOnDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  segmentItem: {
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: PALETTE.midnight,
  },
  segmentActiveOnDark: {
    backgroundColor: PALETTE.white,
  },
  nativeLabel: {
    // The Devanagari label needs a touch more height than the Latin one so the
    // matra on "हि" is not clipped by the pill.
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_MIN + 6,
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  radioEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: SURFACE.border,
  },
  footnote: {
    marginTop: SPACE.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
