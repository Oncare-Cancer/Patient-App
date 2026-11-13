import React, { useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarPlus, MessageCircleQuestion, UserRound } from 'lucide-react-native';
import { Btn, Field, PhoneField, Txt } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { useGuestPrefill } from '@/hooks/useGuestPrefill';
import {
  requestCallBack,
  requestErrorMessage,
  type RequestOrigin,
} from '@/services/requests';
import { DEFAULT_COUNTRY_CODE, isValidPhone } from '@/utils/phone';
import { toastError, toastSuccess } from '@/utils/toast';
import { PALETTE, SHADOW, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * "Any query?" and "Book now", pinned under every article and video.
 *
 * Educational content is where a patient's question comes up, so the way to
 * ask it is right there. "Any query" raises a call-back carrying where it was
 * asked (the article or video), so the person who calls knows the context.
 * "Book now" goes to Book, which handles guests and patients alike.
 */
export function ContentCta({
  origin,
  dark = false,
}: {
  origin: RequestOrigin;
  /** Over a black video background. */
  dark?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View
        style={[
          styles.bar,
          dark && styles.barDark,
          { paddingBottom: Math.max(insets.bottom, SPACE.sm) },
        ]}
      >
        <Btn
          label={t('ui.discover.anyQuery')}
          variant="secondary"
          block={false}
          onDark={dark}
          icon={
            <MessageCircleQuestion
              size={15}
              color={dark ? PALETTE.white : PALETTE.midnight}
              strokeWidth={2.2}
            />
          }
          onPress={() => setOpen(true)}
          style={styles.action}
        />
        <Btn
          label={t('ui.discover.bookNow')}
          block={false}
          icon={<CalendarPlus size={15} color={PALETTE.white} strokeWidth={2.2} />}
          onPress={() => router.replace('/(tabs)/book')}
          style={styles.action}
        />
      </View>
      <QuerySheet visible={open} onClose={() => setOpen(false)} origin={origin} />
    </>
  );
}

/** Name, number and an optional question -> a call-back request. */
export function QuerySheet({
  visible,
  onClose,
  origin,
  topic,
}: {
  visible: boolean;
  onClose: () => void;
  origin: RequestOrigin;
  /** Call-back topic; defaults to 'video' or 'article' from the origin. */
  topic?: string;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { patient } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [question, setQuestion] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  // A signed-in patient should not have to type who they are.
  useEffect(() => {
    if (visible && patient) {
      setName((n) => n || patient.patient_name || '');
      setPhone((p) => p || String(patient.phone_number ?? '').replace(/\D/g, '').slice(-10));
    }
  }, [visible, patient]);
  // A guest: the name and number used last time on this phone.
  useGuestPrefill(visible && !patient, !name && !phone, (c) => {
    setName(c.name);
    setCountryCode(c.countryCode);
    setPhone(c.phone);
  });

  const nameOk = name.trim().length >= 2;
  const phoneOk = isValidPhone(phone, countryCode);

  const send = async () => {
    setTouched(true);
    if (!nameOk || !phoneOk || sending) return;
    setSending(true);
    try {
      await requestCallBack({
        name: name.trim(),
        mobile: phone,
        countryCode,
        callingFor: 'myself',
        topic: topic ?? (origin.type === 'video' ? 'video' : 'article'),
        note: question.trim() || undefined,
        origin,
      });
      toastSuccess(t('ui.discover.querySent'));
      setQuestion('');
      setTouched(false);
      onClose();
    } catch (err) {
      toastError(t('ui.common.somethingWrong'), requestErrorMessage(err) ?? t('ui.common.retry'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={sending ? undefined : onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={styles.grabber} />
        <Txt variant="title">{t('ui.discover.queryTitle')}</Txt>
        <Txt variant="helper" color={TEXT.secondary} style={styles.body}>
          {t('ui.discover.queryBody')}
        </Txt>
        {origin.title ? (
          <View style={styles.context}>
            <Txt variant="helperSm" color={TEXT.secondary} numberOfLines={2}>
              {origin.title}
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
        <PhoneField
          label={t('ui.guest.yourNumber')}
          countryCode={countryCode}
          onCountryCode={setCountryCode}
          value={phone}
          onChangeText={setPhone}
          error={touched && !phoneOk ? t('ui.guest.phoneError') : undefined}
          containerStyle={styles.field}
        />
        <Field
          placeholder={t('ui.discover.queryPlaceholder')}
          value={question}
          onChangeText={setQuestion}
          multiline
          maxLength={1000}
          containerStyle={styles.field}
        />
        <Btn
          label={t('ui.discover.querySend')}
          onPress={() => void send()}
          loading={sending}
          disabled={touched && (!nameOk || !phoneOk)}
          style={styles.send}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.gutter,
    paddingTop: SPACE.sm,
    backgroundColor: SURFACE.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  barDark: { backgroundColor: 'rgba(0,0,0,0.55)', borderTopColor: 'transparent' },
  action: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,45,0.55)' },
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
  body: { marginTop: SPACE.xxs },
  context: {
    backgroundColor: SURFACE.info,
    borderRadius: 10,
    padding: SPACE.sm,
    marginTop: SPACE.sm,
  },
  field: { marginTop: SPACE.md },
  send: { marginTop: SPACE.md },
});
