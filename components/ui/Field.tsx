import React, { useRef, useState } from 'react';
import {
  View,
  Pressable,
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
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { devanagari } = useLanguage();
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

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

      {/*
        The whole box focuses the input, not just the text itself.

        A TextInput only occupies the width of its own content area, so tapping
        the padding, the icon or the "+91" prefix did nothing while still
        raising the keyboard via the parent — which read as "the keyboard came
        up but the field is not focused".
      */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          focused && styles.boxFocused,
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
          ref={inputRef}
          multiline={multiline}
          placeholderTextColor={TEXT.muted}
          selectionColor={PALETTE.purple}
          cursorColor={PALETTE.purple}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
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
      </Pressable>

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
    gap: SPACE.sm,
    // Taller than the 44 minimum: these hold phone numbers and addresses and
    // the design's fields are generous.
    minHeight: 52,
    borderRadius: RADIUS.input,
    borderWidth: 1.4,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACE.md,
  },
  boxMultiline: {
    alignItems: 'flex-start',
    minHeight: 86,
    paddingVertical: SPACE.sm,
  },
  /** Violet ring while editing, matching the selected-state colour. */
  boxFocused: {
    borderColor: PALETTE.purple,
    backgroundColor: SURFACE.card,
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
