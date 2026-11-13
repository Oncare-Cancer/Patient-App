import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Txt } from './Txt';
import { FONTS, PALETTE, RADIUS, SPACE, SURFACE, TEXT, TYPE } from '@/constants/theme';
import { cleanCountryCode, cleanNational } from '@/utils/phone';

/**
 * A mobile number with an editable country code, "+91" by default.
 *
 * Two inputs in one box rather than a country picker: most patients are in
 * India and never touch the code, and an international patient types "44"
 * faster than they scroll a list of 200 countries. The number's length limit
 * follows the code (10 digits for +91, up to the E.164 limit elsewhere), and
 * pasted "+91 98..." or "098..." is cleaned as it is typed.
 *
 * Styled to match Field exactly, so it sits in any form beside one.
 */
export function PhoneField({
  label,
  countryCode,
  onCountryCode,
  value,
  onChangeText,
  error,
  placeholder = '98765 43210',
  containerStyle,
  autoFocus,
}: {
  label?: string;
  /** Digits only, e.g. "91". */
  countryCode: string;
  onCountryCode: (code: string) => void;
  /** National number, digits only. */
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  containerStyle?: object;
  autoFocus?: boolean;
}) {
  const numberRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const isIndia = countryCode === '91';

  return (
    <View style={containerStyle}>
      {label ? (
        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {label}
        </Txt>
      ) : null}

      <Pressable
        onPress={() => numberRef.current?.focus()}
        accessible={false}
        style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}
      >
        <View style={styles.codeWrap}>
          <Txt variant="bodyMedium" script="latin">
            +
          </Txt>
          <TextInput
            value={countryCode}
            onChangeText={(v) => {
              const code = cleanCountryCode(v);
              onCountryCode(code);
              // The digits already typed may not fit the new country's length.
              onChangeText(cleanNational(value, code));
            }}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Country code"
            selectionColor={PALETTE.purple}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              // An emptied code goes back to India rather than staying blank.
              if (!countryCode) onCountryCode('91');
            }}
            style={[styles.input, styles.code]}
          />
        </View>
        <View style={styles.divider} />
        <TextInput
          ref={numberRef}
          value={value}
          onChangeText={(v) => onChangeText(cleanNational(v, countryCode || '91'))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={isIndia ? 13 : 16}
          placeholder={isIndia ? placeholder : 'Mobile number'}
          placeholderTextColor={TEXT.muted}
          selectionColor={PALETTE.purple}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, styles.number]}
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
  label: { marginBottom: SPACE.xxs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: 52,
    borderRadius: RADIUS.input,
    borderWidth: 1.4,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACE.md,
  },
  boxFocused: { borderColor: PALETTE.purple },
  boxError: { borderColor: PALETTE.sosRed },
  codeWrap: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 18, backgroundColor: SURFACE.border },
  input: {
    color: TEXT.primary,
    fontSize: TYPE.body.fontSize,
    fontFamily: FONTS.medium,
    paddingVertical: SPACE.xs,
  },
  code: { minWidth: 30, paddingHorizontal: 2 },
  number: { flex: 1, fontFamily: FONTS.regular },
  error: { marginTop: SPACE.xxs },
});
