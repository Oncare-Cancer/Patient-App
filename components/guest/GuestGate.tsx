import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, FileText, HeartPulse, Inbox } from 'lucide-react-native';
import { Btn, Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { StringKey } from '@/constants/i18n';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * What a guest sees on a screen that holds patient data (My Care, Records).
 *
 * In place of the old behaviour - bouncing the visitor to a full-screen login
 * - the tab opens and says what is here and how to see it. Logging in opens
 * the login modal, which closes back onto this same screen, now filled in.
 */
export function GuestGate({
  title = 'ui.myCare.guestTitle',
  body = 'ui.myCare.guestBody',
  showItems = true,
}: {
  title?: StringKey;
  body?: StringKey;
  /** The three chips naming what is behind login; off inside a single tab. */
  showItems?: boolean;
}) {
  const t = useT();
  const router = useRouter();

  const items: { Icon: typeof CalendarDays; label: StringKey }[] = [
    { Icon: CalendarDays, label: 'ui.activity.appointments' },
    { Icon: Inbox, label: 'ui.activity.requests' },
    { Icon: FileText, label: 'ui.myCare.reports' },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.badge}>
        <HeartPulse size={22} color={PALETTE.purple} strokeWidth={2.2} />
      </View>
      <Txt variant="title" center>
        {t(title)}
      </Txt>
      <Txt variant="body" color={TEXT.secondary} center style={styles.body}>
        {t(body)}
      </Txt>

      {showItems ? (
        <View style={styles.items}>
          {items.map(({ Icon, label }) => (
            <View key={label} style={styles.item}>
              <Icon size={15} color={PALETTE.midnight} strokeWidth={2.2} />
              <Txt variant="helper">{t(label)}</Txt>
            </View>
          ))}
        </View>
      ) : null}

      <Btn label={t('ui.login.login')} onPress={() => router.push('/login')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', gap: SPACE.sm, paddingVertical: SPACE.xl },
  badge: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { marginBottom: SPACE.xs },
  items: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
    backgroundColor: SURFACE.info,
  },
});
