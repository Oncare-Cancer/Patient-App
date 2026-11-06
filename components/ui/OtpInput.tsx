import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  type TextInputKeyPressEvent,
} from 'react-native';

/**
 * The instance type of a TextInput.
 *
 * Derived rather than imported: React Native 0.88 renamed the exported type and
 * `ComponentRef` keeps this correct across versions.
 */
type TextInputRef = React.ComponentRef<typeof TextInput>;
import {
  FONTS,
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * The 4-digit OTP boxes from screen A2.
 *
 * One hidden-ish TextInput per box rather than a single field behind fake boxes:
 * SMS autofill on both platforms targets real inputs, and a single-field trick
 * loses `oneTimeCode` / `sms-otp` autofill, which is the difference between one
 * tap and the patient switching apps to read a code.
 *
 * Length is fixed at 4 because the backend issues 4 digits (see the Rules table
 * on A1) — not a prop, so a screen cannot quietly disagree with the API.
 */
const LENGTH = 4;

export function OtpInput({
  value,
  onChange,
  onComplete,
  autoFocus,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Fired once the 4th digit lands, so the screen can submit without a tap. */
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  error?: boolean;
}) {
  const refs = useRef<(TextInputRef | null)[]>([]);
  const digits = value.padEnd(LENGTH).split('').slice(0, LENGTH);

  /**
   * The last code we already handed to onComplete.
   *
   * Without this the effect below fires on every render while the code is
   * complete, because callers pass an inline arrow for `onComplete` and so its
   * identity changes each time. That submitted the OTP repeatedly: the first
   * call consumed it and signed the patient in, the next came back "invalid",
   * and the screen showed an error on top of a successful login.
   */
  const firedFor = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (value.length !== LENGTH) {
      // Editing after a failed attempt re-arms the auto-submit.
      if (firedFor.current !== null) firedFor.current = null;
      return;
    }
    if (firedFor.current === value) return;
    firedFor.current = value;
    onCompleteRef.current?.(value);
  }, [value]);

  const focus = (i: number) => refs.current[i]?.focus();

  const setAt = (i: number, raw: string) => {
    // Autofill and paste deliver the whole code into one box.
    const incoming = raw.replace(/\D/g, '');
    if (incoming.length > 1) {
      const next = incoming.slice(0, LENGTH);
      onChange(next);
      focus(Math.min(next.length, LENGTH - 1));
      return;
    }

    const chars = value.padEnd(LENGTH).split('');
    chars[i] = incoming;
    const next = chars.join('').trimEnd();
    onChange(next);

    if (incoming && i < LENGTH - 1) focus(i + 1);
  };

  const onKey = (i: number, e: TextInputKeyPressEvent) => {
    // Backspace on an empty box steps back, which is what a patient expects
    // when correcting a mistyped code.
    if (e.nativeEvent.key === 'Backspace' && !digits[i].trim() && i > 0) {
      focus(i - 1);
      const chars = value.padEnd(LENGTH).split('');
      chars[i - 1] = '';
      onChange(chars.join('').trimEnd());
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length: LENGTH }).map((_, i) => {
        const filled = !!digits[i].trim();
        const active = value.length === i;

        return (
          <Pressable key={i} onPress={() => focus(i)} style={styles.boxWrap}>
            <View
              style={[
                styles.box,
                filled && styles.boxFilled,
                active && styles.boxActive,
                error && styles.boxError,
              ]}
            >
              <TextInput
                ref={(r) => {
                  refs.current[i] = r;
                }}
                value={digits[i].trim()}
                onChangeText={(t) => setAt(i, t)}
                onKeyPress={(e) => onKey(i, e)}
                keyboardType="number-pad"
                maxLength={LENGTH}
                autoFocus={autoFocus && i === 0}
                // iOS reads the code from the SMS banner; Android uses the
                // autofill hint. Both need a real input to attach to.
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                style={styles.input}
                selectionColor={PALETTE.purple}
                accessibilityLabel={`OTP digit ${i + 1}`}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  boxWrap: {
    flex: 1,
    maxWidth: 62,
  },
  box: {
    height: 52,
    borderRadius: RADIUS.input,
    borderWidth: 1.4,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: PALETTE.midnight,
  },
  boxActive: {
    borderColor: PALETTE.purple,
    borderWidth: 1.8,
  },
  boxError: {
    borderColor: PALETTE.sosRed,
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    color: TEXT.primary,
    fontFamily: FONTS.semibold,
    fontSize: 20,
    // Without this Android adds its own underline inside the box.
    padding: 0,
  },
});

export const OTP_LENGTH = LENGTH;
