import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import {
  AttachSheet,
  Btn,
  Card,
  Field,
  Txt,
  UploadField,
} from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { useAttachments } from '@/hooks/useAttachments';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/** "RS" from "Dr. Rakesh Sharma". */
function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/**
 * C4 — review and confirm.
 *
 * "Edit details" jumps back to the first step rather than opening an edit form:
 * centre, doctor, type and slot are chained choices, so changing the centre
 * invalidates everything after it. Sending the patient back through the chain is
 * the only version that cannot produce an inconsistent booking.
 *
 * Reports attached here also land in Records ("Saved to your Records too" on the
 * design), which the parent does by uploading with purpose `report`.
 */
export function ReviewStep({
  doctorName,
  doctorSpeciality,
  visitLabel,
  whenLabel,
  centreLabel,
  patientLabel,
  reason,
  onReason,
  attach,
  onEdit,
  onConfirm,
  submitting,
}: {
  doctorName: string;
  doctorSpeciality?: string;
  visitLabel: string;
  whenLabel: string;
  centreLabel: string;
  patientLabel: string;
  reason: string;
  onReason: (v: string) => void;
  attach: ReturnType<typeof useAttachments>;
  onEdit: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const t = useT();

  const rows: { label: string; value: string }[] = [
    { label: t('ui.booking.visit'), value: visitLabel },
    { label: t('ui.booking.dateTime'), value: whenLabel },
    { label: t('ui.booking.centre'), value: centreLabel },
    { label: t('ui.booking.patient'), value: patientLabel },
  ].filter((r) => r.value);

  return (
    <View>
      <Card style={styles.summary}>
        <View style={styles.doctorRow}>
          <View style={styles.avatar}>
            <Txt variant="helper" script="latin" color={PALETTE.midnight}>
              {initials(doctorName)}
            </Txt>
          </View>
          <View style={styles.flex}>
            <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
              {doctorName}
            </Txt>
            {doctorSpeciality ? (
              <Txt variant="helperSm" color={TEXT.muted} script="latin">
                {doctorSpeciality}
              </Txt>
            ) : null}
          </View>
        </View>

        {rows.map((r, i) => (
          <View key={r.label} style={[styles.row, i === 0 && styles.rowFirst]}>
            <Txt variant="helperSm" color={TEXT.muted} style={styles.rowLabel}>
              {r.label}
            </Txt>
            {/* Visit type, time, centre and patient are record data — Latin. */}
            <Txt
              variant="helper"
              script="latin"
              numberOfLines={2}
              style={styles.rowValue}
            >
              {r.value}
            </Txt>
          </View>
        ))}

        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.editLink}
        >
          <Txt variant="helperSm" color={PALETTE.deepBlue} style={styles.link}>
            {t('ui.booking.editDetails')}
          </Txt>
        </Pressable>
      </Card>

      <Field
        label={t('ui.booking.reasonLabel')}
        hint={`(${t('ui.common.optional')})`}
        placeholder={t('ui.booking.reasonPlaceholder')}
        value={reason}
        onChangeText={onReason}
        multiline
        containerStyle={styles.field}
      />

      <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
        {t('ui.booking.attachReports')} ({t('ui.common.optional')})
      </Txt>
      <UploadField
        label={t('ui.booking.addReports')}
        hint={t('ui.booking.savedToRecords')}
        files={attach.files}
        onPick={attach.openSheet}
        onRemove={attach.remove}
      />

      <Card tone="info" style={styles.bringCard}>
        <View style={styles.bringTop}>
          <Info size={14} color={PALETTE.midnight} strokeWidth={2.2} />
          <Txt variant="helper">{t('ui.booking.pleaseBring')}</Txt>
        </View>
        <Txt variant="helperSm" color={TEXT.secondary}>
          · {t('ui.booking.bringPhotoId')}
        </Txt>
        <Txt variant="helperSm" color={TEXT.secondary}>
          · {t('ui.booking.bringReports')}
        </Txt>
      </Card>

      <Btn
        label={t('ui.booking.confirmAppointment')}
        onPress={onConfirm}
        loading={submitting}
        style={styles.confirm}
      />

      <Txt variant="helperSm" color={TEXT.muted} center style={styles.reminder}>
        {t('ui.booking.reminderNote')}
      </Txt>

      <AttachSheet
        visible={attach.sheetOpen}
        onClose={attach.closeSheet}
        onCamera={attach.fromCamera}
        onGallery={attach.fromGallery}
        onDocument={attach.fromDocument}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: 0 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingBottom: SPACE.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
    paddingTop: SPACE.sm,
  },
  rowLabel: { width: 86 },
  rowValue: { flex: 1, textAlign: 'right' },
  editLink: { alignSelf: 'flex-end', minHeight: 30, justifyContent: 'center' },
  link: { textDecorationLine: 'underline' },
  field: { marginTop: SPACE.md },
  label: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  bringCard: { marginTop: SPACE.md, gap: 2 },
  bringTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginBottom: SPACE.xxs,
  },
  confirm: { marginTop: SPACE.lg },
  reminder: { marginTop: SPACE.sm, marginBottom: SPACE.lg },
});
