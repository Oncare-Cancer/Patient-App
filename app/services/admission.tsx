import React, { useEffect, useState } from 'react';
import { View, Pressable, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import {
  AttachSheet,
  Btn,
  Card,
  Chip,
  Screen,
  ScreenHeader,
  Select,
  Txt,
  UploadField,
} from '@/components/ui';
import { useAttachments } from '@/hooks/useAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { createRequest } from '@/services/requests';
import { getCentres, type Centre } from '@/services/catalog';
import { uploadFiles } from '@/services/upload';
import { toastError } from '@/utils/toast';
import { ADMISSION_KINDS, PAYMENT_MODES } from '@/constants/clinical';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';
import type { StringKey } from '@/constants/i18n';

/**
 * H2 — Admission & Day-care.
 *
 * Section 16's status ladder for this type runs through insurance pre-auth and
 * billing, so what the patient supplies here is mostly what those desks need:
 * what is planned, where, when, and how it will be paid for.
 *
 * "Send me a cost estimate" defaults on. An estimate before admission is the
 * thing patients most often say they did not get, and the toggle costs Ops one
 * document.
 */
export default function Admission() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();

  const [kind, setKind] = useState<string>('dayCareChemo');
  const [centreId, setCentreId] = useState('');
  const [centres, setCentres] = useState<Centre[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [payment, setPayment] = useState<string>('insurance');
  const [wantEstimate, setWantEstimate] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const attach = useAttachments();

  useEffect(() => {
    getCentres()
      .then(setCentres)
      .catch(() => {});
  }, []);

  /** Next 14 days as date options — a planned admission is rarely same-day. */
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    };
  });

  const valid = kind.length > 0 && preferredDate.length > 0;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const fileKeys = attach.files.length
        ? await uploadFiles(attach.files, 'document')
        : [];

      const { requestId } = await createRequest({
        type: 'admission',
        subType: kind,
        centre: centreId || undefined,
        preferredDate,
        fileKeys,
        meta: { paymentMode: payment, wantEstimate },
      });

      const kindLabel = t(
        (ADMISSION_KINDS.find((k) => k.value === kind)?.labelKey ??
          'ui.admission.title') as StringKey
      );
      const rows = [
        `${t('ui.admission.whatIsPlanned')}|${kindLabel}`,
        `${t('ui.homeCare.preferredDate')}|${preferredDate}`,
        `${t('ui.admission.howPay')}|${t(
          (PAYMENT_MODES.find((p) => p.value === payment)?.labelKey ??
            'ui.admission.selfPay') as StringKey
        )}`,
      ].join('~');

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
      <ScreenHeader title={t('ui.admission.title')} />

      <Screen>
        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.admission.whatIsPlanned')}
        </Txt>

        {ADMISSION_KINDS.map((k) => {
          const active = kind === k.value;
          return (
            <Pressable
              key={k.value}
              onPress={() => setKind(k.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card
                tone="plain"
                selected={active}
                style={styles.kindCard}
              >
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.flex}>
                  <Txt variant="bodyMedium">{t(k.labelKey as StringKey)}</Txt>
                  <Txt variant="helperSm" color={TEXT.muted}>
                    {t(k.hintKey as StringKey)}
                  </Txt>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {centres.length > 0 ? (
          <View style={styles.spaced}>
            <Select
              label={t('ui.booking.centre')}
              placeholder={t('ui.booking.centre')}
              value={centreId}
              onChange={setCentreId}
              latin
              options={centres.map((c) => ({ value: c.id, label: c.name }))}
            />
          </View>
        ) : null}

        <View style={styles.spaced}>
          <Select
            label={t('ui.homeCare.preferredDate')}
            placeholder={t('ui.homeCare.pickDate')}
            value={preferredDate}
            onChange={setPreferredDate}
            latin
            options={dateOptions}
          />
        </View>

        <Txt variant="helper" color={TEXT.secondary} style={styles.labelTop}>
          {t('ui.admission.doctorsAdvice')}
        </Txt>
        <UploadField
          label={t('ui.admission.uploadDocuments')}
          hint={t('ui.admission.uploadDocumentsHint')}
          files={attach.files}
          onPick={attach.openSheet}
          onRemove={attach.remove}
          pickFromRecordsLabel={t('ui.homeCare.pickFromRecords')}
          onPickFromRecords={() => router.push('/(tabs)/documents')}
        />

        <Txt variant="helper" color={TEXT.secondary} style={styles.labelTop}>
          {t('ui.admission.howPay')}
        </Txt>
        <View style={styles.chips}>
          {PAYMENT_MODES.map((p) => (
            <Chip
              key={p.value}
              label={t(p.labelKey as StringKey)}
              selected={payment === p.value}
              onPress={() => setPayment(p.value)}
            />
          ))}
        </View>

        {/* The saved policy would come from the Insurance & TPA section of the
            profile, which needs an API that does not exist yet. Rather than
            print a fake policy number, the screen says where it will come
            from. */}
        {payment === 'insurance' ? (
          <Card tone="info" style={styles.policyCard}>
            <ShieldCheck size={14} color={PALETTE.midnight} strokeWidth={2.2} />
            <Txt variant="helperSm" color={TEXT.secondary} style={styles.flex}>
              {t('ui.profile.insuranceTpaHint')}
            </Txt>
          </Card>
        ) : null}

        <Card tone="plain" style={styles.estimateRow}>
          <View style={styles.flex}>
            <Txt variant="bodyMedium">{t('ui.admission.sendEstimate')}</Txt>
            <Txt variant="helperSm" color={TEXT.muted}>
              {t('ui.admission.sendEstimateHint')}
            </Txt>
          </View>
          <Switch
            value={wantEstimate}
            onValueChange={setWantEstimate}
            trackColor={{ true: PALETTE.purple, false: SURFACE.border }}
            thumbColor={PALETTE.white}
            accessibilityLabel={t('ui.admission.sendEstimate')}
          />
        </Card>

        <Btn
          label={t('ui.admission.submitButton')}
          onPress={submit}
          loading={submitting}
          disabled={!valid}
          style={styles.submit}
        />
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
  labelTop: {
    marginTop: SPACE.md,
    marginBottom: SPACE.xs,
  },
  kindCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
    minHeight: TOUCH_MIN + 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: PALETTE.purple,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: PALETTE.purple,
  },
  spaced: {
    marginTop: SPACE.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
    borderRadius: RADIUS.card,
  },
  submit: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.lg,
  },
  pressed: {
    opacity: 0.9,
  },
});
