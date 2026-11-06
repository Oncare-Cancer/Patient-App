import React from 'react';
import { View, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, PhoneCall } from 'lucide-react-native';
import { Logo, SosPill, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { SUPPORT_NUMBER } from '@/constants/contact';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SPACE,
  TEXT,
} from '@/constants/theme';

/** "TT" from "Testing Testing". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '—';
}

function greetingKey(): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'greetingMorning';
  if (h < 17) return 'greetingAfternoon';
  return 'greetingEvening';
}

/**
 * The signed-in home header (A4): logo, notifications, call, SOS, then the
 * greeting, patient name, Hospital ID chip and avatar.
 *
 * Extra bottom padding leaves room for the "Book a consultation" card to sit
 * over the header's rounded edge, which is how the design stitches the two
 * together.
 */
export function HomeHeader({
  name,
  hospitalId,
  unreadCount,
  onNotifications,
}: {
  name: string;
  hospitalId?: string;
  unreadCount?: number;
  onNotifications: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const call = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${SUPPORT_NUMBER}`).catch(() => {});
  };

  return (
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

      <View style={styles.topRow}>
        <Logo height={22} />
        <View style={styles.actions}>
          <Pressable
            onPress={onNotifications}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Bell size={14} color={TEXT.onDark} strokeWidth={2.2} />
            {unreadCount ? <View style={styles.badge} /> : null}
          </Pressable>
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
        <View style={styles.greetCol}>
          <Txt variant="helper" color={TEXT.onDarkMuted}>
            {t(`ui.home.${greetingKey()}`)}
          </Txt>
          {/* Patient name is personal data in whatever script it was entered. */}
          <Txt variant="titleLg" color={TEXT.onDark} numberOfLines={1}>
            {name}
          </Txt>
          {hospitalId ? (
            <View style={styles.idChip}>
              <Txt variant="helperSm" color={TEXT.onDark} script="latin">
                {t('ui.home.hospitalId')} · {hospitalId}
              </Txt>
            </View>
          ) : null}
        </View>

        <View style={styles.avatar}>
          <Txt variant="section" color={TEXT.onDark} script="latin">
            {initials(name)}
          </Txt>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: RADIUS.header,
    borderBottomRightRadius: RADIUS.header,
    paddingHorizontal: SPACE.gutter,
    // Deep enough for the booking card to overlap the rounded edge.
    paddingBottom: SPACE.xxl + SPACE.lg,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  actions: {
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
  badge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PALETTE.pink,
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
  },
  greetCol: {
    flex: 1,
    gap: 2,
  },
  idChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    marginTop: SPACE.xxs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PALETTE.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});
