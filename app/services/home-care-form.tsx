import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Home as HomeIcon } from 'lucide-react-native';
import {
  AttachSheet,
  Btn,
  Card,
  Chip,
  Field,
  Screen,
  ScreenHeader,
  Txt,
  UploadField,
} from '@/components/ui';
import { useAttachments } from '@/hooks/useAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { createRequest } from '@/services/requests';
import { uploadFiles } from '@/services/upload';
import { toastError } from '@/utils/toast';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * E2 — the Home Care request form, for nursing and palliative care.
 *
 * Section 12 lists exactly these fields. Two notes on what is deliberately
 * absent:
 *
 *  - No price. The care team calls to confirm the visit and the charges, which
 *    the footnote says out loud, so quoting a number here would be a promise
 *    nobody has made.
 *  - No slot availability check. Preferred date and slot are a request, not a
 *    booking — Ops schedules it.
 */

type DateChoice = 'today' | 'tomorrow' | 'pick';
type Slot = '7-10' | '10-13' | '16-19';

export default function HomeCareForm() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();
  const { kind } = useLocalSearchParams<{ kind?: 'nursing' | 'palliative' }>();

  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [dateChoice, setDateChoice] = useState<DateChoice>('tomorrow');
  const [slot, setSlot] = useState<Slot>('7-10');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const attach = useAttachments();

  const title =
    kind === 'palliative' ? t('ui.homeCare.palliative') : t('ui.homeCare.nursing');

  const slots: { key: Slot; label: string }[] = [
    { key: '7-10', label: '7-10 AM' },
    { key: '10-13', label: '10 AM-1 PM' },
    { key: '16-19', label: '4-7 PM' },
  ];

  /** Resolves the chip choice to an ISO date the backend can store. */
  const preferredDate = useMemo(() => {
    const d = new Date();
    if (dateChoice === 'tomorrow') d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [dateChoice]);

  const valid = address.trim().length > 4 && pincode.length === 6;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      // Files first: a request that references an upload that failed is worse
      // than no request, because Ops sees a prescription line with nothing
      // behind it.
      const fileKeys = attach.files.length
        ? await uploadFiles(attach.files, 'prescription')
        : [];

      const { requestId } = await createRequest({
        type: 'homeCare',
        subType: kind === 'palliative' ? 'palliative' : 'nursing',
        address: address.trim(),
        pincode,
        preferredDate,
        preferredSlot: slot,
        note: note.trim() || undefined,
        fileKeys,
      });

      const rows = [
        `${t('ui.homeCare.title')}|${title}`,
        `${t('ui.homeCare.preferredDate')}|${preferredDate}`,
        `${t('ui.homeCare.preferredTime')}|${slots.find((s) => s.key === slot)?.label ?? ''}`,
      ].join('~');

      // `replace`, not `push`: the form's request is already raised, so going
      // back to it would invite a duplicate.
      router.replace({
        pathname: '/services/submitted',
        params: {
          requestId,
          mobile: patient?.phone_number ?? '',
          rows,
        },
      });
    } catch {
      toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={title} subtitle={t('ui.homeCare.title')} />

      <Screen>
        {/* Patient — auto-filled. Section 12 allows switching to a family
            member, which needs the family-members API that does not exist yet,
            so "Change" is intentionally not offered rather than being a dead
            link. */}
        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.booking.patient')}
        </Txt>
        <Card tone="plain" style={styles.patientCard}>
          <Txt variant="bodyMedium" numberOfLines={1} style={styles.flex}>
            {patient?.patient_name ?? '—'}
          </Txt>
          {patient?.patient_id ? (
            <Txt variant="helperSm" color={TEXT.muted} script="latin">
              UID {patient.patient_id}
            </Txt>
          ) : null}
        </Card>

        <Field
          label={t('ui.homeCare.visitAddress')}
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="H-204, Sector 41, Gurugram"
          containerStyle={styles.field}
        />

        <Field
          label="Pincode"
          value={pincode}
          onChangeText={(v) => setPincode(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          containerStyle={styles.field}
        />

        {/* Serviceability needs the centre master with pincode coverage, which
            is a pending Ops item. Until then the confirmation is honest about
            who decides: the care team on the call. */}
        {pincode.length === 6 ? (
          <Card tone="plain" style={styles.serviceable}>
            <Check size={13} color="#1B7A42" strokeWidth={2.8} />
            <Txt variant="helperSm" color="#1B7A42" style={styles.flex}>
              {t('ui.homeCare.callNote')}
            </Txt>
          </Card>
        ) : null}

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.homeCare.preferredDate')}
        </Txt>
        <View style={styles.chips}>
          <Chip
            label={t('ui.homeCare.today')}
            selected={dateChoice === 'today'}
            onPress={() => setDateChoice('today')}
          />
          <Chip
            label={t('ui.homeCare.tomorrow')}
            selected={dateChoice === 'tomorrow'}
            onPress={() => setDateChoice('tomorrow')}
          />
        </View>

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.homeCare.preferredTime')}
        </Txt>
        <View style={styles.chips}>
          {slots.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              latin
              selected={slot === s.key}
              onPress={() => setSlot(s.key)}
            />
          ))}
        </View>

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.homeCare.prescriptionAdvice')}
        </Txt>
        <UploadField
          label={t('ui.homeCare.uploadPrescription')}
          hint={t('ui.homeCare.uploadHint')}
          files={attach.files}
          onPick={attach.openSheet}
          onRemove={attach.remove}
          pickFromRecordsLabel={t('ui.homeCare.pickFromRecords')}
          onPickFromRecords={() => router.push('/(tabs)/documents')}
        />

        <Field
          label={t('ui.homeCare.noteForTeam')}
          hint={`(${t('ui.common.optional')})`}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder={t('ui.homeCare.notePlaceholder')}
          containerStyle={styles.noteField}
        />

        <Btn
          label={t('ui.homeCare.submitRequest')}
          onPress={submit}
          loading={submitting}
          disabled={!valid}
        />

        <Txt variant="helperSm" color={TEXT.muted} center style={styles.footnote}>
          {t('ui.homeCare.callNote')}
        </Txt>
      </Screen>

      <AttachSheet
        visible={attach.sheetOpen}
        onClose={attach.closeSheet}
        onCamera={attach.fromCamera}
        onGallery={attach.fromGallery}
        onDocument={attach.fromDocument}
        onRecords={() => router.push('/(tabs)/documents')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  flex: {
    flex: 1,
  },
  label: {
    marginBottom: SPACE.xs,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  field: {
    marginBottom: SPACE.md,
  },
  serviceable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs,
    backgroundColor: '#EAF8EF',
    borderColor: '#CDEBD8',
    marginBottom: SPACE.md,
    marginTop: -SPACE.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.md,
  },
  noteField: {
    marginTop: SPACE.md,
    marginBottom: SPACE.lg,
  },
  footnote: {
    marginTop: SPACE.sm,
    marginBottom: SPACE.lg,
  },
});

const _icon = HomeIcon;
