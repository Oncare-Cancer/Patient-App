import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import {
  Btn,
  Card,
  Txt,
} from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
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
 * No reports are collected at this step. The previous booking flow did not ask
 * for them either; the patient is asked to bring them to the visit, and uploads
 * happen from Records.
 */
export function ReviewStep({
  doctorName,
  doctorSpeciality,
  visitLabel,
  whenLabel,
  centreLabel,
  patientLabel,
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

      {/*
        Reason for visit, "Please bring" and the WhatsApp reminder note are all
        gone. Docpulse takes no free-text reason on a booking, so the field was
        collecting something that went nowhere; the other two were advice on a
        screen whose only job is to confirm what was chosen.
      */}

      <Btn
        label={t('ui.booking.confirmAppointment')}
        onPress={onConfirm}
        loading={submitting}
        style={styles.confirm}
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
  label: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  confirm: { marginTop: SPACE.lg },
});
