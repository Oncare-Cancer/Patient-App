import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  FlaskConical,
  Pill,
  Syringe,
  HeartHandshake,
} from 'lucide-react-native';
import { Card, Screen, ScreenHeader, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * E1 — Home Care, choose a service.
 *
 * Two of the four options are not Home Care forms at all: section 12's table
 * routes lab sample collection into the lab flow and medicine delivery into the
 * medicine flow. Only nursing and palliative care use the Home Care form, which
 * is why this screen dispatches rather than collecting anything itself.
 */
export default function HomeCare() {
  const t = useT();
  const router = useRouter();

  const options = [
    {
      key: 'lab',
      Icon: FlaskConical,
      title: t('ui.homeCare.labSample'),
      hint: t('ui.homeCare.labSampleHint'),
      go: () => router.push('/services/lab-tests'),
    },
    {
      key: 'medicine',
      Icon: Pill,
      title: t('ui.homeCare.medicineDelivery'),
      hint: t('ui.homeCare.medicineDeliveryHint'),
      go: () => router.push('/services/medicines'),
    },
    {
      key: 'nursing',
      Icon: Syringe,
      title: t('ui.homeCare.nursing'),
      hint: t('ui.homeCare.nursingHint'),
      go: () => router.push('/services/home-care-form?kind=nursing'),
    },
    {
      key: 'palliative',
      Icon: HeartHandshake,
      title: t('ui.homeCare.palliative'),
      hint: t('ui.homeCare.palliativeHint'),
      go: () => router.push('/services/home-care-form?kind=palliative'),
    },
  ];

  const steps = [
    t('ui.homeCare.step1'),
    t('ui.homeCare.step2'),
    t('ui.homeCare.step3'),
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.homeCare.title')}>
        <View style={styles.hero}>
          <Txt variant="title" color={TEXT.onDark}>
            {t('ui.homeCare.heroTitle')}
          </Txt>
          <Txt variant="helperSm" color={TEXT.onDarkMuted} style={styles.heroBody}>
            {t('ui.homeCare.heroBody')}
          </Txt>
        </View>
      </ScreenHeader>

      <Screen withNav>
        <Txt variant="section" style={styles.question}>
          {t('ui.homeCare.whatDoYouNeed')}
        </Txt>

        {options.map(({ key, Icon, title, hint, go }) => (
          <Pressable
            key={key}
            onPress={go}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${hint}`}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card tone="plain" style={styles.option}>
              <View style={styles.optionIcon}>
                <Icon size={16} color={PALETTE.purple} strokeWidth={2.2} />
              </View>
              <View style={styles.optionMeta}>
                <Txt variant="bodyMedium">{title}</Txt>
                <Txt variant="helperSm" color={TEXT.muted}>
                  {hint}
                </Txt>
              </View>
              <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
            </Card>
          </Pressable>
        ))}

        <Card tone="info" style={styles.howCard}>
          <Txt variant="helper">{t('ui.homeCare.howItWorks')}</Txt>
          <View style={styles.stepsRow}>
            {steps.map((label, i) => (
              <View key={label} style={styles.step}>
                <LinearGradient
                  colors={[...GRADIENT.selected]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepDot}
                >
                  <Txt variant="helperSm" color={PALETTE.white} script="latin">
                    {i + 1}
                  </Txt>
                </LinearGradient>
                <Txt variant="helperSm" color={TEXT.secondary} numberOfLines={3}>
                  {label}
                </Txt>
              </View>
            ))}
          </View>
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
  hero: {
    marginTop: SPACE.md,
  },
  heroBody: {
    marginTop: SPACE.xs,
    maxWidth: 290,
  },
  question: {
    marginBottom: SPACE.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
    minHeight: TOUCH_MIN + 16,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionMeta: {
    flex: 1,
  },
  howCard: {
    marginTop: SPACE.md,
    gap: SPACE.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  step: {
    flex: 1,
    gap: SPACE.xs,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});

const _radius = RADIUS;
