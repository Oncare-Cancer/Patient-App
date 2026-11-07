import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import {
  AttachSheet,
  Btn,
  Card,
  Chip,
  Field,
  Screen,
  ScreenHeader,
  Select,
  Txt,
  UploadField,
} from '@/components/ui';
import { GuestDetailsSheet } from '@/components/guest/GuestDetailsSheet';
import { useAttachments } from '@/hooks/useAttachments';
import { useRequestSubmit } from '@/hooks/useRequestSubmit';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { getCentres, type Centre } from '@/services/catalog';
import { CANCER_TYPES } from '@/constants/clinical';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * H1 — Second Opinion.
 *
 * Consent is required rather than pre-ticked: the patient is agreeing to share
 * biopsy and imaging reports with doctors they have not met, which is not a
 * default anyone should assume.
 *
 * The consent wording lives in `legal.*`, so it stays English until
 * Marketing/Legal sign off on a Hindi version — see constants/i18n/README.md.
 */
export default function SecondOpinion() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();

  const [cancerType, setCancerType] = useState('');
  const [treatedAt, setTreatedAt] = useState('');
  const [question, setQuestion] = useState('');
  const [connectVia, setConnectVia] = useState<'video' | 'centre'>('video');
  const [centreId, setCentreId] = useState('');
  const [centres, setCentres] = useState<Centre[]>([]);
  const [consent, setConsent] = useState(false);

  const attach = useAttachments();

  useEffect(() => {
    getCentres()
      .then(setCentres)
      .catch(() => {
        // The centre list is not required to submit — Ops assigns one from the
        // patient's record if it is missing.
      });
  }, []);

  const valid =
    cancerType.length > 0 && question.trim().length > 4 && consent;

  const { submit, submitting, uploadLabel, isGuest, guestSheet } =
    useRequestSubmit({
    type: 'secondOpinion',
    files: attach.files,
    uploadPurpose: 'report',
    canSubmit: valid,
    summary: cancerType,
    build: () => ({
      centre: centreId || undefined,
      note: question.trim(),
      meta: {
        cancerType,
        treatedAt: treatedAt.trim() || undefined,
        connectVia,
        consentAt: new Date().toISOString(),
      },
    }),
    onSubmitted: ({ requestId, phone }) => {
      const rows = [
        `${t('ui.secondOpinion.typeOfCancer')}|${cancerType}`,
        `${t('ui.secondOpinion.howConnect')}|${
          connectVia === 'video'
            ? t('ui.booking.videoCall')
            : t('ui.secondOpinion.visitCentre')
        }`,
        `${t('ui.secondOpinion.reports')}|${attach.files.length}`,
      ].join('~');

      router.replace({
        pathname: '/services/submitted',
        params: { requestId, mobile: phone, rows },
      });
    },
  });

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.secondOpinion.title')}>
        <View style={styles.hero}>
          <Txt variant="title" color={TEXT.onDark}>
            {t('ui.secondOpinion.heroTitle')}
          </Txt>
          <Txt variant="helperSm" color={TEXT.onDarkMuted} style={styles.heroBody}>
            {t('ui.secondOpinion.heroBody')}
          </Txt>
        </View>
      </ScreenHeader>

      <Screen>
        {/* A guest has no record to show here; they are asked for a name and
            number at the point of submit instead, so an empty card with a dash
            in it would be noise. */}
        {isGuest ? null : (
          <>
            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.booking.patient')}
            </Txt>
            <Card tone="plain" style={styles.patientCard}>
              <Txt variant="bodyMedium" numberOfLines={1} style={styles.flex}>
                {patient?.patient_name ?? '\u2014'}
              </Txt>
              {patient?.phone_number ? (
                <Txt variant="helperSm" color={TEXT.muted} script="latin">
                  +91 {patient.phone_number}
                </Txt>
              ) : null}
            </Card>
          </>
        )}

        <Select
          label={t('ui.secondOpinion.typeOfCancer')}
          placeholder={t('ui.secondOpinion.typeOfCancer')}
          value={cancerType}
          onChange={setCancerType}
          latin
          options={CANCER_TYPES.map((c) => ({ value: c, label: c }))}
        />

        <Field
          label={t('ui.secondOpinion.treatedAt')}
          hint={`(${t('ui.common.optional')})`}
          placeholder={t('ui.secondOpinion.treatedAtPlaceholder')}
          value={treatedAt}
          onChangeText={setTreatedAt}
          containerStyle={styles.field}
        />

        <Field
          label={t('ui.secondOpinion.yourQuestion')}
          placeholder={t('ui.secondOpinion.questionPlaceholder')}
          value={question}
          onChangeText={setQuestion}
          multiline
          containerStyle={styles.field}
        />

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.secondOpinion.reports')}
        </Txt>
        {/* Uploading needs a session, because the storage key is scoped to a
            patient id. A guest is told so rather than shown a button that
            cannot work; the team collects reports on the call. */}
        {isGuest ? (
          <Card tone="info" style={styles.patientCard}>
            <Txt variant="helperSm" color={TEXT.secondary} style={styles.flex}>
              {t('ui.guest.uploadNeedsLogin')}
            </Txt>
          </Card>
        ) : (
          <UploadField
            label={t('ui.secondOpinion.uploadReports')}
            hint={t('ui.secondOpinion.uploadReportsHint')}
            files={attach.files}
            onPick={attach.openSheet}
            onRemove={attach.remove}
          />
        )}

        <Txt variant="helper" color={TEXT.secondary} style={styles.labelTop}>
          {t('ui.secondOpinion.howConnect')}
        </Txt>
        <View style={styles.chips}>
          <Chip
            label={t('ui.booking.videoCall')}
            selected={connectVia === 'video'}
            onPress={() => setConnectVia('video')}
          />
          <Chip
            label={t('ui.secondOpinion.visitCentre')}
            selected={connectVia === 'centre'}
            onPress={() => setConnectVia('centre')}
          />
        </View>

        {centres.length > 0 ? (
          <Select
            label={t('ui.secondOpinion.preferredCentre')}
            placeholder={t('ui.secondOpinion.preferredCentre')}
            value={centreId}
            onChange={setCentreId}
            latin
            options={centres.map((c) => ({ value: c.id, label: c.name }))}
          />
        ) : null}

        <Pressable
          onPress={() => setConsent((c) => !c)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, consent && styles.checkboxOn]}>
            {consent ? (
              <Check size={12} color={PALETTE.white} strokeWidth={3} />
            ) : null}
          </View>
          <Txt variant="helperSm" color={TEXT.secondary} style={styles.flex}>
            {t('legal.consentSecondOpinion')}
          </Txt>
        </Pressable>

        <Btn
          label={uploadLabel ?? t('ui.secondOpinion.requestButton')}
          onPress={submit}
          loading={submitting}
          disabled={!valid}
        />
      </Screen>

      <AttachSheet
        visible={attach.sheetOpen}
        onClose={attach.closeSheet}
        onCamera={attach.fromCamera}
        onGallery={attach.fromGallery}
        onDocument={attach.fromDocument}
      />

      <GuestDetailsSheet {...guestSheet} />
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
  hero: {
    marginTop: SPACE.md,
  },
  heroBody: {
    marginTop: SPACE.xs,
    maxWidth: 290,
  },
  label: {
    marginBottom: SPACE.xs,
  },
  labelTop: {
    marginTop: SPACE.md,
    marginBottom: SPACE.xs,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  field: {
    marginTop: SPACE.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs,
    marginTop: SPACE.lg,
    marginBottom: SPACE.lg,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: PALETTE.purple,
    borderColor: PALETTE.purple,
  },
});
