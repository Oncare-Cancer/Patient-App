import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { MapPin, User } from 'lucide-react-native';
import {
  Btn,
  Card,
  Txt,
} from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { Practitioner } from '@/services/booking';
import {
  PALETTE,
  RADIUS,
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
  doctor,
  visitLabel,
  whenLabel,
  centreLabel,
  patientLabel,
  onEdit,
  onConfirm,
  submitting,
  onViewProfile,
  onCentreDetails,
}: {
  /**
   * The whole practitioner, not a name and a speciality string.
   *
   * It used to take two strings, which is why this screen could only ever
   * draw initials: the photo and the CMS record were right there on the
   * object the caller already had, and the component had no way to see them.
   */
  doctor: Practitioner;
  visitLabel: string;
  whenLabel: string;
  centreLabel: string;
  patientLabel: string;
  onEdit: () => void;
  onConfirm: () => void;
  submitting: boolean;
  /** Omitted when the doctor has no CMS record to open. */
  onViewProfile?: () => void;
  /** Omitted when the booking's centre could not be matched to a record. */
  onCentreDetails?: () => void;
}) {
  const doctorName = doctor.name;
  const doctorSpeciality = doctor.speciality;
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
            {doctor.img ? (
              <Image
                source={{ uri: doctor.img }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel={doctorName}
              />
            ) : (
              // Initials rather than a generic person icon: this is the one
              // doctor the patient is about to see, so their own letters read
              // better than a placeholder silhouette.
              <Txt variant="helper" script="latin" color={PALETTE.midnight}>
                {initials(doctorName)}
              </Txt>
            )}
          </View>
          <View style={styles.flex}>
            <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
              {doctorName}
            </Txt>
            {doctorSpeciality ? (
              <Txt variant="helperSm" color={PALETTE.purple} script="latin">
                {doctorSpeciality}
              </Txt>
            ) : null}
            {doctor.experience ? (
              // Already carries its unit ("18+ Years") — nothing appended.
              <Txt variant="helperSm" color={TEXT.muted} script="latin">
                {String(doctor.experience)}
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

        {/*
          Both ways into the detail the patient may want to double-check
          before confirming: who the doctor is, and where the centre actually
          is. Each is offered only when there is a record behind it.
        */}
        {onViewProfile || onCentreDetails ? (
          <View style={styles.links}>
            {onViewProfile ? (
              <Pressable
                onPress={onViewProfile}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.linkBtn}
              >
                <User size={12} color={PALETTE.deepBlue} strokeWidth={2.4} />
                <Txt variant="helperSm" color={PALETTE.deepBlue}>
                  {t('ui.booking.viewProfile')}
                </Txt>
              </Pressable>
            ) : null}
            {onCentreDetails ? (
              <Pressable
                onPress={onCentreDetails}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.linkBtn}
              >
                <MapPin size={12} color={PALETTE.deepBlue} strokeWidth={2.4} />
                <Txt variant="helperSm" color={PALETTE.deepBlue}>
                  {t('ui.booking.centreDetails')}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}

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
  photo: { width: '100%', height: '100%' },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.md,
    marginTop: SPACE.xs,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
  },
  avatar: {
    // Was 36px and circular, which was fine for two letters and useless for a
    // face. These are head-and-shoulders portraits, so they get the same
    // rounded rectangle the rest of the app uses, at a size you can see.
    width: 56,
    height: 56,
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
