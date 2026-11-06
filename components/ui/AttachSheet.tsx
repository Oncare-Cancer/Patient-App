import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Images, FileText, FolderOpen } from 'lucide-react-native';
import { Txt } from './Txt';
import { useT } from '@/contexts/LanguageContext';
import {
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * Where to attach a prescription from.
 *
 * Section 13 lists four sources — camera, gallery, PDF and My Records. Offering
 * them as a sheet rather than four buttons on the form keeps the upload control
 * to one line on screens that already have a lot on them (E2, F1, G1, H1, H2).
 */
export function AttachSheet({
  visible,
  onClose,
  onCamera,
  onGallery,
  onDocument,
  onRecords,
}: {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
  /** Omitted where picking from Records makes no sense. */
  onRecords?: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const rows = [
    { key: 'camera', Icon: Camera, label: t('ui.upload.camera'), run: onCamera },
    { key: 'gallery', Icon: Images, label: t('ui.upload.gallery'), run: onGallery },
    { key: 'pdf', Icon: FileText, label: t('ui.upload.document'), run: onDocument },
    ...(onRecords
      ? [
          {
            key: 'records',
            Icon: FolderOpen,
            label: t('ui.upload.fromRecords'),
            run: onRecords,
          },
        ]
      : []),
  ];

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

      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.md }]}>
        <View style={styles.grabber} />

        {rows.map(({ key, Icon, label, run }, i) => (
          <Pressable
            key={key}
            onPress={() => {
              // Close first: on iOS launching a picker from inside a visible
              // modal can leave the picker behind the sheet.
              onClose();
              run();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              i > 0 && styles.rowDivider,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.icon}>
              <Icon size={17} color={PALETTE.midnight} strokeWidth={2.1} />
            </View>
            <Txt variant="bodyMedium" style={styles.flex}>
              {label}
            </Txt>
          </Pressable>
        ))}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={styles.cancel}
        >
          <Txt variant="button" color={TEXT.secondary}>
            {t('ui.common.cancel')}
          </Txt>
        </Pressable>
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
    marginBottom: SPACE.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN + 8,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    minHeight: TOUCH_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACE.xs,
    borderRadius: RADIUS.pill,
    backgroundColor: SURFACE.disabled,
  },
  pressed: {
    opacity: 0.8,
  },
});
