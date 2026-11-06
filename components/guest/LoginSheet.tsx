import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, UserRound } from 'lucide-react-native';
import { Btn, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  savePendingIntent,
  type PendingIntent,
} from '@/services/pendingIntent';
import {
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * A3 / B5 — the login bottom sheet a locked action opens.
 *
 * Section 06 is specific about the behaviour this implements:
 *  - it opens "on the same screen, not a new page", so it is a Modal over the
 *    current route rather than a navigation
 *  - the patient's selection is kept and shown back to them as "Your selection
 *    is saved", which is the difference between a login prompt that loses a
 *    half-filled cart and one that does not
 *  - after OTP they return to the same step (B6), which is why `savedSelection`
 *    is a caller-supplied summary — the screen that owns the state describes it
 */
export function LoginSheet({
  visible,
  onClose,
  onLogin,
  /** One-line summary of what is being preserved, e.g. "Dr. Rakesh Sharma · Fri 6 Nov · 2:15 PM". */
  savedSelection,
  /** Overrides the default "Please login to continue" heading. */
  title,
  body,
  /**
   * Stored before leaving for login so the patient comes back to this step
   * (B6). Omit for locked tabs that have nothing to restore.
   */
  intent,
}: {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  savedSelection?: string;
  title?: string;
  body?: string;
  intent?: PendingIntent;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const goToLogin = () => {
    // Saved on the way out rather than when the sheet opens: a patient who taps
    // "Not now" should not have an intent waiting for their next login.
    if (intent) void savePendingIntent(intent);
    onLogin();
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
        accessibilityLabel={t('ui.login.notNow')}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={styles.grabber} />

        <View style={styles.badge}>
          <UserRound size={20} color={PALETTE.midnight} strokeWidth={2.2} />
        </View>

        <Txt variant="title" center>
          {title ?? t('ui.login.guestPromptTitle')}
        </Txt>
        <Txt variant="body" color={TEXT.secondary} center style={styles.body}>
          {body ?? t('ui.login.guestPromptBody')}
        </Txt>

        {savedSelection ? (
          <View style={styles.saved}>
            <Check size={13} color="#1B7A42" strokeWidth={2.8} />
            <View style={styles.flex}>
              <Txt variant="helperSm" color="#1B7A42">
                {t('ui.login.selectionSaved')}
              </Txt>
              {/* Doctor name, date and time — record data, kept Latin. */}
              <Txt variant="helper" script="latin" numberOfLines={2}>
                {savedSelection}
              </Txt>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Btn
            label={t('ui.login.notNow')}
            variant="secondary"
            onPress={onClose}
            block={false}
            style={styles.action}
          />
          <Btn
            label={t('ui.login.login')}
            onPress={goToLogin}
            block={false}
            style={styles.action}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,20,45,0.55)',
  },
  flex: {
    flex: 1,
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
    marginBottom: SPACE.lg,
  },
  badge: {
    alignSelf: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: SURFACE.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  body: {
    marginTop: SPACE.xxs,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs,
    backgroundColor: '#EAF8EF',
    borderRadius: RADIUS.chip,
    padding: SPACE.sm,
    marginTop: SPACE.md,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  action: {
    flex: 1,
  },
});
