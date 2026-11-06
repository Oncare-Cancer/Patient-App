import React from 'react';
import { View, StyleSheet, Linking, Platform, Share } from 'react-native';
import {
  CalendarPlus,
  Check,
  Navigation,
  PhoneCall,
  Share2,
} from 'lucide-react-native';
import { Btn, Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { SUPPORT_NUMBER } from '@/constants/contact';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * C5 — appointment confirmed.
 *
 * The four actions are the design's. "Add to calendar" uses a Google Calendar
 * template URL rather than expo-calendar: it needs no native module, no calendar
 * permission, and works on web too. A dedicated calendar integration would be a
 * permission prompt and a dependency for one button.
 */
export function ConfirmedStep({
  bookingId,
  doctorName,
  whenLabel,
  whenIso,
  centreLabel,
  onViewAppointments,
  onHome,
}: {
  bookingId: string;
  doctorName: string;
  whenLabel: string;
  whenIso: string;
  centreLabel: string;
  onViewAppointments: () => void;
  onHome: () => void;
}) {
  const t = useT();

  const directions = () => {
    const query = encodeURIComponent(centreLabel || 'Oncare Cancer Centre');
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`
      ).catch(() => {})
    );
  };

  const addToCalendar = () => {
    const start = new Date(whenIso);
    if (Number.isNaN(start.getTime())) return;
    // Consultations are scheduled in 30-minute blocks upstream.
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const stamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const url =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${encodeURIComponent(`Oncare · ${doctorName}`)}` +
      `&dates=${stamp(start)}/${stamp(end)}` +
      `&location=${encodeURIComponent(centreLabel)}` +
      `&details=${encodeURIComponent(`Booking ID ${bookingId}`)}`;

    Linking.openURL(url).catch(() => {});
  };

  const call = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${SUPPORT_NUMBER}`).catch(() => {});
  };

  const share = () => {
    Share.share({
      message: `Oncare appointment\n${doctorName}\n${whenLabel}\n${centreLabel}\nBooking ID ${bookingId}`,
    }).catch(() => {});
  };

  const rows: { label: string; value: string }[] = [
    { label: t('ui.booking.doctor'), value: doctorName },
    { label: t('ui.booking.when'), value: whenLabel },
    { label: t('ui.booking.where'), value: centreLabel },
  ].filter((r) => r.value);

  return (
    <View>
      <View style={styles.center}>
        <View style={styles.badge}>
          <Check size={28} color="#16A34A" strokeWidth={3} />
        </View>
        <Txt variant="titleLg" center>
          {t('ui.booking.confirmedTitle')}
        </Txt>
        <Txt variant="helperSm" color={TEXT.secondary} center>
          {t('ui.booking.bookingId')}{' '}
          <Txt variant="helper" script="latin">
            {bookingId}
          </Txt>
          {'  ·  '}
          {t('ui.booking.confirmationSent')}
        </Txt>
      </View>

      <Card tone="plain" style={styles.card}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.row, i > 0 && styles.rowDivider]}>
            <Txt variant="helperSm" color={TEXT.muted} style={styles.rowLabel}>
              {r.label}
            </Txt>
            <Txt
              variant="helper"
              script="latin"
              numberOfLines={2}
              style={styles.rowValue}
            >
              {r.value}
            </Txt>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <Btn
          label={t('ui.booking.directions')}
          variant="secondary"
          compact
          block={false}
          onPress={directions}
          icon={<Navigation size={13} color="#20206B" strokeWidth={2.2} />}
          style={styles.action}
        />
        <Btn
          label={t('ui.booking.addToCalendar')}
          variant="secondary"
          compact
          block={false}
          onPress={addToCalendar}
          icon={<CalendarPlus size={13} color="#20206B" strokeWidth={2.2} />}
          style={styles.action}
        />
        <Btn
          label={t('ui.booking.callCentre')}
          variant="secondary"
          compact
          block={false}
          onPress={call}
          icon={<PhoneCall size={13} color="#20206B" strokeWidth={2.2} />}
          style={styles.action}
        />
        <Btn
          label={t('ui.common.share')}
          variant="secondary"
          compact
          block={false}
          onPress={share}
          icon={<Share2 size={13} color="#20206B" strokeWidth={2.2} />}
          style={styles.action}
        />
      </View>

      <Txt variant="helperSm" color={TEXT.muted} center style={styles.reminder}>
        {t('ui.booking.reminderNote')}
      </Txt>

      <Btn
        label={t('ui.booking.viewMyAppointments')}
        onPress={onViewAppointments}
      />
      <Btn
        label={t('ui.booking.backToHome')}
        variant="secondary"
        onPress={onHome}
        style={styles.home}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: SPACE.xxs,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.lg,
  },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E7F6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  card: { gap: 0 },
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
  rowLabel: { width: 74 },
  rowValue: { flex: 1, textAlign: 'right' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.md,
  },
  action: { flexGrow: 1, flexBasis: '46%' },
  reminder: { marginTop: SPACE.md, marginBottom: SPACE.lg },
  home: { marginTop: SPACE.sm, marginBottom: SPACE.lg },
});
