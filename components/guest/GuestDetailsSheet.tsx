import React, { useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, UserRound } from 'lucide-react-native';
import { Btn, Field, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * Collects a guest's name and number at the point of submitting a request.
 *
 * This is the alternative to the login sheet for the four service flows a
 * guest can now complete — medicines, lab tests, admission and second opinion.
 * Section 06 put those behind login; asking instead for the two fields the
 * team actually needs in order to call back turns a dead end into a lead, and
 * a patient trying to price chemotherapy should not have to create an account
 * first.
 *
 * Why a sheet at submit rather than a field on the form:
 *  - the patient has already done the work by the time they see it, so the ask
 *    is justified rather than a gate;
 *  - it keeps one code path for signed-in patients, whose name and number come
 *    from the session and who never see this at all.
 *
 * Both fields are validated here rather than only server-side, because the
 * server's rejection would arrive after the submit button had already spun.
 */
export function GuestDetailsSheet({
  visible,
  onClose,
  onSubmit,
  submitting,
  /** One line describing what is being sent, e.g. "4 medicines". */
  summary,
  /** Offered alongside, for a patient who would rather have an account. */
  onLogin,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (details: { name: string; phone: string }) => void;
  submitting?: boolean;
  summary?: string;
  onLogin?: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length >= 2;
  // Indian mobile numbers are ten digits and never start below 6. Checked
  // because an unreachable number makes the whole request unactionable.
  const phoneOk = /^[6-9]\d{9}$/.test(phone);

  const send = () => {
    setTouched(true);
    if (!nameOk || !phoneOk || submitting) return;
    onSubmit({ name: name.trim(), phone });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={submitting ? undefined : onClose}
        accessibilityLabel={t('ui.common.cancel')}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={styles.grabber} />

        <Txt variant="title">{t('ui.guest.detailsTitle')}</Txt>
        <Txt variant="helper" color={TEXT.secondary} style={styles.body}>
          {t('ui.guest.detailsBody')}
        </Txt>

        {summary ? (
          <View style={styles.summary}>
            <Txt variant="helperSm" color={TEXT.secondary}>
              {t('ui.guest.detailsSending')}
            </Txt>
            <Txt variant="bodyMedium" numberOfLines={2}>
              {summary}
            </Txt>
          </View>
        ) : null}

        <Field
          icon={<UserRound size={15} color={TEXT.muted} strokeWidth={2} />}
          label={t('ui.guest.yourName')}
          placeholder={t('ui.guest.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={touched && !nameOk ? t('ui.guest.nameError') : undefined}
          containerStyle={styles.field}
        />

        <Field
          icon={<Phone size={15} color={TEXT.muted} strokeWidth={2} />}
          label={t('ui.guest.yourNumber')}
          placeholder="98765 43210"
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          error={touched && !phoneOk ? t('ui.guest.phoneError') : undefined}
          containerStyle={styles.field}
        />

        <Txt variant="helperSm" color={TEXT.muted} style={styles.note}>
          {t('ui.guest.detailsNote')}
        </Txt>

        <Btn
          label={t('ui.guest.submitRequest')}
          onPress={send}
          loading={submitting}
          disabled={touched && (!nameOk || !phoneOk)}
          style={styles.send}
        />

        {onLogin ? (
          <Pressable
            onPress={submitting ? undefined : onLogin}
            accessibilityRole="button"
            style={styles.loginRow}
          >
            <Txt variant="helper" color={PALETTE.deepBlue} center style={styles.link}>
              {t('ui.guest.ratherLogin')}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </Modal>
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
    paddingTop: SPACE.sm,
    ...SHADOW.nav,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: SURFACE.border,
    marginBottom: SPACE.md,
  },
  body: {
    marginTop: SPACE.xxs,
  },
  summary: {
    backgroundColor: SURFACE.info,
    borderRadius: RADIUS.chip,
    padding: SPACE.sm,
    marginTop: SPACE.md,
    gap: 2,
  },
  field: {
    marginTop: SPACE.md,
  },
  note: {
    marginTop: SPACE.sm,
  },
  send: {
    marginTop: SPACE.md,
  },
  loginRow: {
    minHeight: 40,
    justifyContent: 'center',
    marginTop: SPACE.xs,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
