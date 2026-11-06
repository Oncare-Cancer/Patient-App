import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ambulance, Building2, Home, PhoneCall } from 'lucide-react-native';
import { Txt } from './Txt';
import { Btn } from './Btn';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  SHADOW,
  TOUCH_MIN,
} from '@/constants/theme';
import { SUPPORT_NUMBER, EMERGENCY_NUMBER } from '@/constants/contact';
import { logSosTap } from '@/services/sos';

type Where = 'centre' | 'home';

/**
 * Emergency sheet — screen H4, rules in section 11.
 *
 * Three things the PDF fixes and this keeps:
 *  - asks "Where are you right now?" and branches on the answer
 *  - always shows the 112 line, whatever the patient picks
 *  - logs every tap to the Ops Dashboard with patient, time and option chosen
 *
 * The log is fire-and-forget on purpose: a failed network call must never stand
 * between a patient and a phone dialler.
 */
export function SosSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<Where | null>(null);

  const dial = (number: string) => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${number}`).catch(() => {
      // Dialler unavailable (web, tablet without telephony). Nothing useful to
      // show here — the number is on screen for the patient to read.
    });
  };

  const choose = async (where: Where) => {
    setBusy(where);
    logSosTap(where);
    dial(where === 'centre' ? SUPPORT_NUMBER : EMERGENCY_NUMBER);
    setBusy(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={styles.badge}>
          <Ambulance size={26} color={TEXT.onDark} strokeWidth={2.2} />
        </View>

        <Txt variant="titleLg" center style={styles.heading}>
          Emergency help
        </Txt>
        <Txt variant="body" color={TEXT.secondary} center>
          Where are you right now?
        </Txt>

        <View style={styles.options}>
          <WhereOption
            icon={<Building2 size={20} color={PALETTE.midnight} strokeWidth={2} />}
            title="At an Oncare centre"
            hint="Alert the centre team"
            onPress={() => choose('centre')}
            busy={busy === 'centre'}
          />
          <WhereOption
            icon={<Home size={20} color={PALETTE.midnight} strokeWidth={2} />}
            title="At home"
            hint="Call ambulance / our team"
            onPress={() => choose('home')}
            busy={busy === 'home'}
          />
        </View>

        <Pressable
          onPress={() => {
            logSosTap('emergency-112');
            dial(EMERGENCY_NUMBER);
          }}
          style={({ pressed }) => [styles.emergencyRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Life-threatening emergency, call ${EMERGENCY_NUMBER}`}
        >
          <PhoneCall size={13} color={PALETTE.sosRed} strokeWidth={2.4} />
          <Txt variant="helper" color={PALETTE.sosRed}>
            Life-threatening? Call {EMERGENCY_NUMBER} now
          </Txt>
        </Pressable>

        <Btn label="Cancel" variant="secondary" onPress={onClose} style={styles.cancel} />
      </View>
    </Modal>
  );
}

function WhereOption({
  icon,
  title,
  hint,
  onPress,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.optionIcon}>{icon}</View>
      <Txt variant="bodyMedium" center numberOfLines={2}>
        {title}
      </Txt>
      <Txt variant="helperSm" color={TEXT.muted} center numberOfLines={2}>
        {hint}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,20,45,0.55)',
  },
  sheet: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xxl,
    alignItems: 'stretch',
    ...SHADOW.nav,
  },
  badge: {
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: PALETTE.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -50,
    marginBottom: SPACE.md,
    borderWidth: 4,
    borderColor: SURFACE.card,
  },
  heading: {
    marginBottom: SPACE.xxs,
  },
  options: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  option: {
    flex: 1,
    minHeight: 96,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.sm,
    gap: 2,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xxs,
  },
  emergencyRow: {
    marginTop: SPACE.md,
    minHeight: TOUCH_MIN,
    borderRadius: RADIUS.chip,
    backgroundColor: '#FFF1F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
  },
  cancel: {
    marginTop: SPACE.md,
    alignSelf: 'center',
    paddingHorizontal: SPACE.xxl,
  },
  pressed: {
    opacity: 0.85,
  },
});
