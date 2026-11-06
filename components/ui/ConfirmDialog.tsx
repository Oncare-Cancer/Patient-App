import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { Txt } from './Txt';
import { Btn } from './Btn';
import {
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * A two-button confirmation, in the app's own styling.
 *
 * NOT IN PDF — the mockups do not show a confirm dialog, but the destructive
 * actions they do show (Logout, Cancel appointment) need one.
 *
 * This exists instead of `Alert.alert` because the native dialog is drawn by
 * the OS: it uses the system font, system colours and a different button order
 * on Android and iOS, so it looked like it belonged to another app. It is also
 * separate from `PremiumAlert`, which is a one-button informational alert and
 * cannot express "confirm or cancel".
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  /** Styles the confirm button as destructive and gives it the red icon ring. */
  destructive,
  icon,
  onConfirm,
  onCancel,
  busy,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Tapping the backdrop cancels, which is the non-destructive choice. */}
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityLabel={cancelLabel}
      />

      <View style={styles.centre} pointerEvents="box-none">
        <View
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          {icon ? (
            <View style={[styles.icon, destructive && styles.iconDanger]}>
              {icon}
            </View>
          ) : null}

          <Txt variant="title" center>
            {title}
          </Txt>
          {message ? (
            <Txt variant="body" color={TEXT.secondary} center style={styles.message}>
              {message}
            </Txt>
          ) : null}

          <View style={styles.actions}>
            <Btn
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              block={false}
              style={styles.action}
            />
            <Btn
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={busy}
              block={false}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,20,45,0.55)',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.lg,
  },
  card: {
    // Capped rather than a percentage of the window: on a tablet a dialog that
    // scales with the screen ends up absurdly wide.
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.card,
    backgroundColor: SURFACE.card,
    padding: SPACE.lg,
    alignItems: 'center',
    ...SHADOW.nav,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACE.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  iconDanger: {
    backgroundColor: '#FFF5F6',
  },
  message: {
    marginTop: SPACE.xxs,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  action: {
    flex: 1,
  },
});
