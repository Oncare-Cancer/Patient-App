import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Globe,
  LogOut,
  MapPin,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react-native';
import {
  Card,
  LanguageRows,
  Screen,
  SosPill,
  Txt,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import {
  SUPPORT_NUMBER,
  SUPPORT_NUMBER_DISPLAY,
  WHATSAPP_NUMBER,
} from '@/constants/contact';
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
 * D3 — Profile.
 *
 * Three groups, as the design has them: Account, Preferences, Help. Logout in
 * red at the bottom with the app version under it.
 *
 * Rows whose backend does not exist yet — Family members, Insurance & TPA,
 * Notifications — are present but marked, rather than being hidden or wired to
 * a dead screen. A patient tapping a row and landing nowhere is worse than a
 * row that says it is coming.
 *
 * The FAQ and help-query path is unchanged: it still calls `getFaqQuestions` and
 * `askUsEmailQuery`, only restyled.
 */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '—';
}

export default function Profile() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, logout } = useAuth();
  const [languageOpen, setLanguageOpen] = useState(false);

  const name = patient?.patient_name ?? '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const call = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${SUPPORT_NUMBER}`).catch(() => {});
  };

  const whatsapp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`).catch(
      () => {}
    );
  };

  const confirmLogout = () => {
    Alert.alert(t('ui.common.logout'), t('ui.profile.logoutConfirm'), [
      { text: t('ui.common.cancel'), style: 'cancel' },
      {
        text: t('ui.common.logout'),
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <Screen
        withNav
        contentStyle={styles.content}
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
              <Txt variant="title" color={TEXT.onDark}>
                {t('ui.profile.title')}
              </Txt>
              <SosPill />
            </View>

            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Txt variant="titleLg" color={TEXT.onDark} script="latin">
                  {initials(name)}
                </Txt>
              </View>
              <Txt variant="titleLg" color={TEXT.onDark} center numberOfLines={1}>
                {name}
              </Txt>
              <Txt variant="helperSm" color={TEXT.onDarkMuted} center script="latin">
                {[
                  patient?.patient_id ? `UID ${patient.patient_id}` : null,
                  patient?.gender,
                  patient?.age_yrs,
                  patient?.phone_number ? `+91 ${patient.phone_number}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            </View>
          </LinearGradient>
        }
      >
        <Group title={t('ui.profile.account')}>
          <Row
            Icon={UserRound}
            title={t('ui.profile.personalDetails')}
            hint={t('ui.profile.personalDetailsHint')}
            onPress={() => router.push('/profile/personal')}
          />
          <Row
            Icon={Users}
            title={t('ui.profile.familyMembers')}
            hint={t('ui.profile.comingSoon')}
            disabled
          />
          <Row
            Icon={ShieldCheck}
            title={t('ui.profile.insuranceTpa')}
            hint={t('ui.profile.comingSoon')}
            disabled
          />
        </Group>

        <Group title={t('ui.profile.preferences')}>
          <Row
            Icon={MapPin}
            title={t('ui.profile.preferredCentre')}
            hint={t('ui.profile.comingSoon')}
            disabled
          />
          <Row
            Icon={Globe}
            title={t('ui.language.title')}
            hint={t('ui.language.subtitle')}
            onPress={() => setLanguageOpen((v) => !v)}
            expanded={languageOpen}
          />
          {languageOpen ? (
            <View style={styles.languageBlock}>
              <LanguageRows />
            </View>
          ) : null}
          <Row
            Icon={Bell}
            title={t('ui.profile.notifications')}
            hint={t('ui.profile.notificationsHint')}
            onPress={() => router.push('/notifications')}
          />
        </Group>

        <Group title={t('ui.profile.help')}>
          <Row
            Icon={PhoneCall}
            title={t('ui.profile.callSupport')}
            hint={SUPPORT_NUMBER_DISPLAY}
            hintLatin
            onPress={call}
          />
          <Row
            Icon={MessageCircle}
            title={t('ui.profile.chatWhatsapp')}
            onPress={whatsapp}
          />
          <Row
            Icon={CircleHelp}
            title={t('ui.profile.faqs')}
            onPress={() => router.push('/profile/faq')}
          />
        </Group>

        <Pressable
          onPress={confirmLogout}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <LogOut size={16} color={PALETTE.sosRed} strokeWidth={2.3} />
          <Txt variant="button" color={PALETTE.sosRed}>
            {t('ui.common.logout')}
          </Txt>
        </Pressable>

        <Txt variant="helperSm" color={TEXT.muted} center style={styles.version}>
          {t('ui.profile.version', { version })}
        </Txt>
      </Screen>
    </View>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Txt variant="helper" color={TEXT.muted} style={styles.groupTitle}>
        {title}
      </Txt>
      <Card tone="plain" padded={false} style={styles.groupCard}>
        {children}
      </Card>
    </View>
  );
}

function Row({
  Icon,
  title,
  hint,
  hintLatin,
  onPress,
  disabled,
  expanded,
}: {
  Icon: typeof UserRound;
  title: string;
  hint?: string;
  hintLatin?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, expanded }}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowOff,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Icon size={16} color={PALETTE.midnight} strokeWidth={2.1} />
      </View>
      <View style={styles.rowMeta}>
        <Txt variant="bodyMedium" numberOfLines={1}>
          {title}
        </Txt>
        {hint ? (
          <Txt
            variant="helperSm"
            color={TEXT.muted}
            script={hintLatin ? 'latin' : 'auto'}
            numberOfLines={1}
          >
            {hint}
          </Txt>
        ) : null}
      </View>
      {!disabled ? (
        <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  content: { paddingTop: SPACE.lg },
  header: {
    borderBottomLeftRadius: RADIUS.header,
    borderBottomRightRadius: RADIUS.header,
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPACE.xl,
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
  identity: {
    alignItems: 'center',
    gap: 2,
    marginTop: SPACE.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: PALETTE.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.28)',
    marginBottom: SPACE.sm,
  },
  group: { marginBottom: SPACE.lg },
  groupTitle: { marginBottom: SPACE.xs },
  groupCard: { paddingHorizontal: SPACE.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN + 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
  },
  rowOff: { opacity: 0.5 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: { flex: 1 },
  languageBlock: {
    paddingBottom: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    minHeight: TOUCH_MIN + 6,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: '#F7CFD6',
    backgroundColor: '#FFF5F6',
  },
  version: { marginTop: SPACE.md, marginBottom: SPACE.lg },
  pressed: { opacity: 0.8 },
});
