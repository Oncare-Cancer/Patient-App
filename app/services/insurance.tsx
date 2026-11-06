import React from 'react';
import { View, Linking, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, PhoneCall, ShieldCheck } from 'lucide-react-native';
import { Btn, Card, Screen, ScreenHeader, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { SUPPORT_NUMBER, WHATSAPP_NUMBER } from '@/constants/contact';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Insurance Help — the sixth tile on A4's Care services grid.
 *
 * Section 05 lists it among the services but the PDF gives it no screen of its
 * own, and section 19 leaves "Payment options: online gateway, pay on delivery,
 * insurance / Govt. schemes" open with Finance. So this deliberately does not
 * invent a claims form.
 *
 * What it does instead is the honest version of the tile: explain what the desk
 * can help with and put the patient in touch. The admission flow (H2) already
 * collects insurance intent where it actually matters, and the TPA section of
 * the profile will hold the policy once that API exists.
 */
export default function InsuranceHelp() {
  const t = useT();
  const router = useRouter();

  const call = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${SUPPORT_NUMBER}`).catch(() => {});
  };

  const whatsapp = () => {
    const digits = WHATSAPP_NUMBER.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
  };

  const helps = [
    t('ui.insurance.helpCashless'),
    t('ui.insurance.helpPreAuth'),
    t('ui.insurance.helpDocuments'),
    t('ui.insurance.helpSchemes'),
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.home.insuranceHelp')} />

      <Screen>
        <Card style={styles.intro}>
          <View style={styles.badge}>
            <ShieldCheck size={20} color={PALETTE.purple} strokeWidth={2.2} />
          </View>
          <Txt variant="section">{t('ui.insurance.title')}</Txt>
          <Txt variant="body" color={TEXT.secondary}>
            {t('ui.insurance.body')}
          </Txt>
        </Card>

        <Txt variant="section" style={styles.sectionTitle}>
          {t('ui.insurance.whatWeHelp')}
        </Txt>
        <Card tone="plain" style={styles.list}>
          {helps.map((h, i) => (
            <View key={h} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.dot} />
              <Txt variant="bodySm" color={TEXT.secondary} style={styles.flex}>
                {h}
              </Txt>
            </View>
          ))}
        </Card>

        <Btn
          label={t('ui.profile.callSupport')}
          onPress={call}
          icon={<PhoneCall size={15} color={PALETTE.white} strokeWidth={2.2} />}
          style={styles.action}
        />
        <Btn
          label={t('ui.profile.chatWhatsapp')}
          variant="secondary"
          onPress={whatsapp}
          icon={
            <MessageCircle size={15} color={PALETTE.midnight} strokeWidth={2.2} />
          }
          style={styles.action}
        />

        <Card tone="info" style={styles.admissionNote}>
          <Txt variant="helperSm" color={TEXT.secondary}>
            {t('ui.insurance.admissionNote')}
          </Txt>
          <Btn
            label={t('ui.admission.title')}
            variant="ghost"
            block={false}
            onPress={() => router.push('/services/admission')}
          />
        </Card>
      </Screen>
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
    gap: SPACE.xs,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xxs,
  },
  sectionTitle: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PALETTE.purple,
    marginTop: 7,
  },
  action: {
    marginTop: SPACE.md,
  },
  admissionNote: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.lg,
    gap: SPACE.xxs,
    alignItems: 'flex-start',
  },
});
