import { View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Btn, Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * C5 — appointment confirmed.
 *
 * The design's four secondary actions (Directions, Add to calendar, Call centre,
 * Share) are deliberately gone. Four outline pills competing with the two real
 * next steps made the screen read as a toolbar, and everything they offered is
 * available on the appointment itself in Activity, where it stays useful after
 * this screen is dismissed.
 */
export function ConfirmedStep({
  bookingId,
  doctorName,
  whenLabel,
  centreLabel,
  onViewAppointments,
  onHome,
}: {
  bookingId: string;
  doctorName: string;
  whenLabel: string;
  centreLabel: string;
  onViewAppointments: () => void;
  onHome: () => void;
}) {
  const t = useT();

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
            {/* Doctor, time and centre are record data — Latin in both
                languages. */}
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
    marginBottom: SPACE.sm,
  },
  card: {
    backgroundColor: SURFACE.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  rowLabel: {
    width: 76,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  reminder: {
    marginTop: SPACE.md,
    marginBottom: SPACE.md,
  },
  home: {
    marginTop: SPACE.sm,
    marginBottom: SPACE.lg,
  },
});
