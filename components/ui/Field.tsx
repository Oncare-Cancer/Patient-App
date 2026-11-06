import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Txt } from './Txt';
import {
  FONTS,
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
  TYPE,
} from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = TextInputProps & {
  label?: string;
  /** Appended to the label in muted text, e.g. "(optional)". */
  hint?: string;
  error?: string;
  /** Fixed prefix inside the box, used for the "+91" on phone fields. */
  prefix?: string;
  /** Icon at the left, used for search fields. */
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
};

/**
 * Text input, search box and textarea in one.
 *
 * `fontFamily` is set explicitly on the TextInput because, unlike Text, an input
 * does not inherit it — forget this and every form field silently falls back to
 * the system face while the rest of the screen is Montserrat.
 */
export function Field({
  label,
  hint,
  error,
  prefix,
  icon,
  containerStyle,
  multiline,
  style,
  ...rest
}: Props) {
  const { devanagari } = useLanguage();

  return (
    <View style={containerStyle}>
      {label ? (
        <View style={styles.labelRow}>
          <Txt variant="helper" color={TEXT.secondary}>
            {label}
          </Txt>
          {hint ? (
            <Txt variant="helperSm" color={TEXT.muted}>
              {hint}
            </Txt>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          !!error && styles.boxError,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        {prefix ? (
          <>
            <Txt variant="bodyMedium" script="latin">
              {prefix}
            </Txt>
            <View style={styles.divider} />
          </>
        ) : null}
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={TEXT.muted}
          style={[
            styles.input,
            {
              // Inputs hold names, addresses and notes, so they follow the
              // reading script rather than being pinned to Latin.
              fontFamily: devanagari ? 'NotoSansDevanagari-Regular' : FONTS.regular,
            },
            multiline && styles.inputMultiline,
            style,
          ]}
        />
      </View>

      {error ? (
        <Txt variant="helperSm" color={PALETTE.sosRed} style={styles.error}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
    marginBottom: SPACE.xxs,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TOUCH_MIN,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACE.sm,
  },
  boxMultiline: {
    alignItems: 'flex-start',
    minHeight: 76,
    paddingVertical: SPACE.sm,
  },
  boxError: {
    borderColor: PALETTE.sosRed,
  },
  icon: {
    opacity: 0.6,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: SURFACE.border,
  },
  input: {
    flex: 1,
    color: TEXT.primary,
    fontSize: TYPE.body.fontSize,
    paddingVertical: SPACE.xs,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 58,
  },
  error: {
    marginTop: SPACE.xxs,
  },
});
