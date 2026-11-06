import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { PhoneCall } from 'lucide-react-native';
import { Txt } from './Txt';
import { PALETTE, RADIUS, TEXT, SPACE } from '@/constants/theme';
import { useSos } from '@/contexts/SosContext';

/**
 * The red SOS pill. Section 11 of the PDF makes two things rules, not options:
 *
 *  1. It sits in the TOP-RIGHT of the header on every screen — login, every
 *     booking step, all tabs, forms, success screens.
 *  2. It is part of the header, never a floating overlay. The old
 *     FloatingCallBubble covered "Review Appointment" and "Contact Support"
 *     (issue #8), which is exactly what this placement prevents.
 *
 * It also has to work without login, so it reads nothing from AuthContext.
 */
export function SosPill({ compact }: { compact?: boolean }) {
  const { open } = useSos();

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Emergency help"
      hitSlop={10}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        {!compact && <PhoneCall size={11} color={TEXT.onDark} strokeWidth={2.4} />}
        <Txt variant="helperSm" color={TEXT.onDark} style={styles.label}>
          SOS
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: PALETTE.sosRed,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.sm,
    // Visual height stays 26 to match the design; hitSlop above carries the
    // touch target past the 44 px minimum.
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.85,
  },
});
