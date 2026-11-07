import React from 'react';
import { View, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  PhoneCall,
  UserRound,
  Home as HomeIcon,
  FlaskConical,
  Pill,
  BedDouble,
  MapPin,
  Lock,
} from 'lucide-react-native';
import {
  Btn,
  Card,
  Logo,
  Screen,
  SosPill,
  Txt,
} from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { SUPPORT_NUMBER } from '@/constants/contact';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';
import { GuestNav } from '@/components/guest/GuestNav';
import { ServiceGrid, type ServiceTile } from '@/components/home/ServiceGrid';

/**
 * B1 — Guest home.
 *
 * Section 06's table splits what a guest can do from what needs login. This
 * screen only offers the first column: browse centres, search doctors, see
 * approximate prices, request a call back, SOS. The locked actions live behind
 * the login sheet on the screens that own them, not here.
 */
export default function GuestHome() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const call = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${SUPPORT_NUMBER}`).catch(() => {});
  };

  const services: ServiceTile[] = [
    {
      key: 'second-opinion',
      label: t('ui.home.secondOpinion'),
      Icon: UserRound,
      onPress: () => router.push('/guest/callback'),
    },
    {
      key: 'home-care',
      label: t('ui.home.homeCare'),
      Icon: HomeIcon,
      onPress: () => router.push('/guest/callback'),
    },
    {
      key: 'lab-prices',
      label: t('ui.guest.labTestPrices'),
      Icon: FlaskConical,
      onPress: () => router.push('/guest/lab-prices'),
    },
    {
      key: 'medicine-prices',
      label: t('ui.guest.medicinePrices'),
      Icon: Pill,
      onPress: () => router.push('/guest/medicine-prices'),
    },
    {
      key: 'admission',
      label: t('ui.home.admissionDaycare'),
      Icon: BedDouble,
      onPress: () => router.push('/guest/callback'),
    },
    {
      key: 'centres',
      label: t('ui.guest.ourCentres'),
      Icon: MapPin,
      onPress: () => router.push('/guest/centres'),
    },
  ];

  return (
    <View style={styles.root}>
      <Screen
        withNav
        bleed={
          <LinearGradient
            colors={[...GRADIENT.header]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + SPACE.sm }]}
          >
            <LinearGradient
              colors={[...GRADIENT.glow]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.glow}
              pointerEvents="none"
            />

            <View style={styles.headerTop}>
              <Logo height={22} />
              <View style={styles.headerActions}>
                <Pressable
                  onPress={call}
                  accessibilityRole="button"
                  accessibilityLabel={t('ui.profile.callSupport')}
                  hitSlop={8}
                  style={styles.iconBtn}
                >
                  <PhoneCall size={14} color={TEXT.onDark} strokeWidth={2.2} />
                </Pressable>
                <SosPill />
              </View>
            </View>

            <View style={styles.greetRow}>
              <View style={styles.flex}>
                <Txt variant="helper" color={TEXT.onDarkMuted}>
                  {t('ui.guest.welcome')}
                </Txt>
                <Txt variant="titleLg" color={TEXT.onDark}>
                  {t('ui.guest.helloGuest')}
                </Txt>
              </View>
              <Btn
                label={t('ui.login.login')}
                variant="gradient"
                compact
                block={false}
                onPress={() => router.replace('/login')}
              />
            </View>
          </LinearGradient>
        }
      >
        {/* Book a consultation — browsing is open, confirming is not. */}
        <Card style={styles.bookCard}>
          <Txt variant="section">{t('ui.home.bookConsultation')}</Txt>
          <Txt variant="helperSm" color={TEXT.muted}>
            {t('ui.guest.browseNote')}
          </Txt>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            style={styles.searchBox}
          >
            <Search size={15} color={TEXT.muted} strokeWidth={2} />
            <Txt variant="bodySm" color={TEXT.muted} numberOfLines={1} style={styles.flex}>
              {t('ui.home.searchPlaceholder')}
            </Txt>
          </Pressable>
        </Card>

        {/* Call back — the one thing a guest can submit without logging in. */}
        <Pressable
          onPress={() => router.push('/guest/callback')}
          accessibilityRole="button"
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card tone="plain" style={styles.callbackCard}>
            <View style={styles.callbackIcon}>
              <PhoneCall size={16} color={PALETTE.midnight} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Txt variant="bodyMedium">{t('ui.guest.notSureTitle')}</Txt>
              <Txt variant="helperSm" color={TEXT.muted}>
                {t('ui.guest.notSureBody')}
              </Txt>
            </View>
            <View style={styles.callMe}>
              <Txt variant="helperSm" color={TEXT.onDark} center numberOfLines={1}>
                {t('ui.guest.callMe')}
              </Txt>
            </View>
          </Card>
        </Pressable>

        <Txt variant="section" style={styles.sectionTitle}>
          {t('ui.home.careServices')}
        </Txt>
        <ServiceGrid tiles={services} />

        <Card tone="info" style={styles.lockedNote}>
          <Lock size={13} color={PALETTE.midnight} strokeWidth={2.2} />
          <Txt variant="helperSm" color={TEXT.secondary} style={styles.flex}>
            {t('ui.guest.loginToSee')}
          </Txt>
        </Card>
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
  header: {
    borderBottomLeftRadius: RADIUS.header,
    borderBottomRightRadius: RADIUS.header,
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPACE.lg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.75,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
  },
  bookCard: {
    gap: SPACE.xxs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TOUCH_MIN,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.screen,
    paddingHorizontal: SPACE.sm,
    marginTop: SPACE.sm,
  },
  callbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.sm,
  },
  callbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * A pill, not a 44px circle: "Call me" is two words and wrapped onto two
   * lines inside the circle. The whole card is the tap target, so this only
   * has to be legible, not 44 tall.
   */
  callMe: {
    minHeight: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
  },
  sectionTitle: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  lockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.md,
  },
  pressed: {
    opacity: 0.9,
  },
});
