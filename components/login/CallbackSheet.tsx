import React, { useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneCall } from 'lucide-react-native';
import { Btn, Field, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  PALETTE,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * Asks for a name so a call-back can be raised.
 *
 * This covers the existing backend behaviour rather than a new feature: when
 * sendOTP answers `code === 3` the number is not in the HIS, and sending the
 * same request again with a name registers a call-back (`code === 4`). The old
 * app did this through a bare prompt; this is the same call, restyled, and it
 * reuses the B4 copy because it is the same thing the patient is asking for.
 */
export function CallbackSheet({
  visible,
  message,
  submitting,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  /** The backend's own explanation, e.g. "No details found for this number." */
  message: string;
  submitting?: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setName('');
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
        onPress={onClose}
        accessibilityLabel={t('ui.common.cancel')}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={styles.badge}>
          <PhoneCall size={22} color={PALETTE.white} strokeWidth={2.2} />
        </View>

        <Txt variant="title" center>
          {t('ui.guest.callBackTitle')}
        </Txt>

        {message ? (
          <Txt variant="body" color={TEXT.secondary} center style={styles.message}>
            {message}
          </Txt>
        ) : null}

        <Field
          label={t('ui.guest.yourName')}
          placeholder={t('ui.guest.fullName')}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          returnKeyType="send"
          onSubmitEditing={submit}
          containerStyle={styles.field}
        />

        <Btn
          label={t('ui.guest.requestCallBack')}
          onPress={submit}
          loading={submitting}
          disabled={!name.trim()}
        />
        <Btn
          label={t('ui.common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={styles.cancel}
        />
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
    paddingTop: SPACE.xxl,
    ...SHADOW.nav,
  },
  badge: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -46,
    marginBottom: SPACE.md,
    borderWidth: 4,
    borderColor: SURFACE.card,
  },
  message: {
    marginTop: SPACE.xxs,
  },
  field: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.md,
  },
  cancel: {
    marginTop: SPACE.sm,
  },
});
