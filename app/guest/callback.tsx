import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import {
  Btn,
  Card,
  Chip,
  Field,
  Screen,
  ScreenHeader,
  Txt,
} from '@/components/ui';
import { GuestNav } from '@/components/guest/GuestNav';
import { useT } from '@/contexts/LanguageContext';
import { requestCallBack } from '@/services/requests';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * B4 — request a call back. The one form a guest can submit without login.
 *
 * Creates a lead on the Central Ops Dashboard with source "App – Guest", per
 * section 06. Consent is required before the button enables: the copy says we
 * will call and WhatsApp them, so it cannot be a pre-ticked afterthought.
 */

type CallingFor = 'myself' | 'family';
type Topic = 'consultation' | 'secondOpinion' | 'treatmentCost' | 'homeCare';
type City = 'DELHI/NCR' | 'BANGALORE';

export default function GuestCallback() {
  const t = useT();
  const router = useRouter();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [callingFor, setCallingFor] = useState<CallingFor>('myself');
  const [topic, setTopic] = useState<Topic>('consultation');
  const [city, setCity] = useState<City>('DELHI/NCR');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const valid = name.trim().length > 1 && mobile.length === 10 && consent;

  const submit = async () => {
    if (!valid) return;
    setSending(true);
    try {
      await requestCallBack({
        name: name.trim(),
        mobile,
        callingFor,
        topic,
        city,
      });
      setDone(true);
      toastSuccess(t('ui.homeCare.submittedTitle'), t('ui.guest.notSureBody'));
    } catch {
      toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
    } finally {
      setSending(false);
    }
  };

  const topics: { key: Topic; label: string }[] = [
    { key: 'consultation', label: t('ui.guest.consultation') },
    { key: 'secondOpinion', label: t('ui.home.secondOpinion') },
    { key: 'treatmentCost', label: t('ui.guest.treatmentCost') },
    { key: 'homeCare', label: t('ui.home.homeCare') },
  ];

  if (done) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('ui.guest.callBackTitle')} />
        <Screen withNav>
          <Card style={styles.doneCard}>
            <View style={styles.doneBadge}>
              <Check size={24} color="#16A34A" strokeWidth={3} />
            </View>
            <Txt variant="titleLg" center>
              {t('ui.homeCare.submittedTitle')}
            </Txt>
            <Txt variant="body" color={TEXT.secondary} center>
              {t('ui.homeCare.willCallYou')}
            </Txt>
            <Txt variant="section" script="latin" center>
              +91 {mobile}
            </Txt>
            <Btn
              label={t('ui.booking.backToHome')}
              onPress={() => router.replace('/guest')}
              style={styles.doneBtn}
            />
          </Card>
        </Screen>
        <GuestNav active="home" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.guest.callBackTitle')} />

      <Screen withNav>
        <Card tone="info" style={styles.intro}>
          <Txt variant="bodyMedium">{t('ui.guest.noLoginNeeded')}</Txt>
          <Txt variant="helperSm" color={TEXT.secondary}>
            {t('ui.guest.callBackBody')}
          </Txt>
        </Card>

        <Field
          label={t('ui.guest.yourName')}
          placeholder={t('ui.guest.fullName')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          containerStyle={styles.field}
        />

        <Field
          label={t('ui.guest.mobileNumber')}
          prefix="+91"
          placeholder={t('ui.guest.enterMobile')}
          value={mobile}
          onChangeText={(v) => setMobile(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={10}
          containerStyle={styles.field}
        />

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.guest.callingFor')}
        </Txt>
        <View style={styles.chips}>
          <Chip
            label={t('ui.guest.myself')}
            selected={callingFor === 'myself'}
            onPress={() => setCallingFor('myself')}
          />
          <Chip
            label={t('ui.guest.familyMember')}
            selected={callingFor === 'family'}
            onPress={() => setCallingFor('family')}
          />
        </View>

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.guest.helpWith')}
        </Txt>
        <View style={styles.chips}>
          {topics.map((o) => (
            <Chip
              key={o.key}
              label={o.label}
              selected={topic === o.key}
              onPress={() => setTopic(o.key)}
            />
          ))}
        </View>

        <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
          {t('ui.guest.city')}
        </Txt>
        <View style={styles.chips}>
          <Chip
            label="Delhi NCR"
            latin
            selected={city === 'DELHI/NCR'}
            onPress={() => setCity('DELHI/NCR')}
          />
          <Chip
            label="Bengaluru"
            latin
            selected={city === 'BANGALORE'}
            onPress={() => setCity('BANGALORE')}
          />
        </View>

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
            {t('legal.consentCallBack')}
          </Txt>
        </Pressable>

        <Btn
          label={t('ui.guest.requestCallBack')}
          onPress={submit}
          loading={sending}
          disabled={!valid}
          style={styles.submit}
        />

        <Txt variant="helperSm" color={TEXT.muted} center style={styles.footnote}>
          {t('legal.guestLeadNote')}
        </Txt>
      </Screen>

      <GuestNav active="home" />
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
  intro: {
    gap: SPACE.xxs,
    marginBottom: SPACE.md,
  },
  field: {
    marginBottom: SPACE.md,
  },
  label: {
    marginBottom: SPACE.xs,
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
    marginTop: SPACE.xs,
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
  submit: {
    marginBottom: SPACE.sm,
  },
  footnote: {
    marginBottom: SPACE.lg,
  },
  doneCard: {
    alignItems: 'center',
    gap: SPACE.xs,
    paddingVertical: SPACE.xl,
  },
  doneBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E7F6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.sm,
  },
  doneBtn: {
    marginTop: SPACE.lg,
    alignSelf: 'stretch',
  },
});
