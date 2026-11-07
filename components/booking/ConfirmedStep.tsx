import { View, Pressable, Image, StyleSheet } from 'react-native';
import { Building2, Check, MapPin, User } from 'lucide-react-native';
import { Btn, Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { Practitioner } from '@/services/booking';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * C5 — appointment confirmed.
 *
 * The doctor gets a proper card here, not just a name in a detail row: this is
 * the screen a patient screenshots and comes back to, so the face and
 * speciality matter more than the label "Doctor" next to a string.
 *
 * Directions is here because it now has something real to point at: the
 * booking's Docpulse location is matched to the centre master, which holds the
 * postal address and coordinates. It was left out while the only thing
 * available was the Docpulse label, which is the literal string "Oncare Cancer
 * Center" for every location and so opened an arbitrary centre.
 *
 * Add to calendar, Call centre and Share are still absent, and the WhatsApp
 * reminder note with them: everything they offered lives on the appointment
 * itself in Activity, where it stays useful after this screen is dismissed,
 * and the note promised a message the backend does not send.
 */
export function ConfirmedStep({
  bookingId,
  doctor,
  whenLabel,
  visitLabel,
  centreLabel,
  onViewProfile,
  onViewAppointments,
  onHome,
  onDirections,
  onCentreDetails,
}: {
  bookingId: string;
  doctor: Practitioner;
  whenLabel: string;
  visitLabel: string;
  centreLabel: string;
  onViewProfile: () => void;
  onViewAppointments: () => void;
  onHome: () => void;
  /** Omitted when the booking's centre could not be matched to an address. */
  onDirections?: () => void;
  /** Omitted for the same reason — no matched centre, no detail page. */
  onCentreDetails?: () => void;
}) {
  const t = useT();

  const rows: { label: string; value: string }[] = [
    { label: t('ui.booking.visit'), value: visitLabel },
    { label: t('ui.booking.when'), value: whenLabel },
    { label: t('ui.booking.where'), value: centreLabel },
  ].filter((r) => r.value);

  return (
    <View>
      <View style={styles.center}>
        <View style={styles.badge}>
          <Check size={44} color="#16A34A" strokeWidth={3} />
        </View>
        <Txt variant="titleLg" center>
          {t('ui.booking.confirmedTitle')}
        </Txt>
        <Txt variant="helperSm" color={TEXT.secondary} center>
          {t('ui.booking.bookingId')}{' '}
          <Txt variant="helper" script="latin">
            {bookingId}
          </Txt>
        </Txt>
      </View>

      {/* The doctor, as a card. */}
      <Card tone="plain" style={styles.doctorCard}>
        <View style={styles.doctorRow}>
          <View style={styles.avatar}>
            {doctor.img ? (
              <Image
                source={{ uri: doctor.img }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel={doctor.name}
              />
            ) : (
              <User size={28} color={PALETTE.purple} strokeWidth={2} />
            )}
          </View>

          <View style={styles.doctorMeta}>
            {/* Name, speciality and experience are record data — Latin. */}
            <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
              {doctor.name}
            </Txt>
            {doctor.speciality ? (
              <Txt
                variant="helperSm"
                color={TEXT.secondary}
                script="latin"
                numberOfLines={2}
              >
                {String(doctor.speciality)}
              </Txt>
            ) : null}
            {doctor.experience ? (
              // Already carries its unit ("24+ Years") — nothing appended.
              <Txt
                variant="helperSm"
                color={TEXT.muted}
                script="latin"
                numberOfLines={1}
              >
                {String(doctor.experience)}
              </Txt>
            ) : null}

            {doctor.hasProfile ? (
              <Pressable
                onPress={onViewProfile}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.profileLink}
              >
                <Txt
                  variant="helperSm"
                  color={PALETTE.deepBlue}
                  style={styles.link}
                >
                  {t('ui.booking.viewProfile')}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </View>

        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
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

        {/* Offered only when the centre was matched, so the button always
            opens the right place rather than a hopeful search. */}
        {/*
          Both offered only when the centre was matched to a record, so
          neither can open the wrong place or a page that does not exist.
        */}
        {onDirections || onCentreDetails ? (
          <View style={styles.centreActions}>
            {onDirections ? (
              <Pressable
                onPress={onDirections}
                accessibilityRole="button"
                accessibilityLabel={t('ui.booking.directions')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.centreBtn,
                  pressed && styles.pressed,
                ]}
              >
                <MapPin size={14} color={PALETTE.midnight} strokeWidth={2.4} />
                <Txt variant="helper">{t('ui.booking.directions')}</Txt>
              </Pressable>
            ) : null}
            {onCentreDetails ? (
              <Pressable
                onPress={onCentreDetails}
                accessibilityRole="button"
                accessibilityLabel={t('ui.booking.centreDetails')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.centreBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Building2 size={14} color={PALETTE.midnight} strokeWidth={2.4} />
                <Txt variant="helper">{t('ui.booking.centreDetails')}</Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Btn
        label={t('ui.booking.viewMyAppointments')}
        onPress={onViewAppointments}
        style={styles.primary}
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
    // Larger than the rest of the app's icon circles on purpose: it is the one
    // thing on screen saying "this worked".
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E7F6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  doctorCard: {
    backgroundColor: SURFACE.card,
    gap: SPACE.sm,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md,
    paddingBottom: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  doctorMeta: { flex: 1, gap: 1 },
  profileLink: {
    alignSelf: 'flex-start',
    minHeight: 26,
    justifyContent: 'center',
  },
  link: { textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
  },
  rowLabel: { width: 76 },
  centreActions: {
    flexDirection: 'row',
    gap: SPACE.xs,
    marginTop: SPACE.xxs,
  },
  centreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    minHeight: 40,
    borderRadius: RADIUS.pill,
    borderWidth: 1.2,
    borderColor: SURFACE.border,
  },
  pressed: { opacity: 0.86 },
  rowValue: { flex: 1, textAlign: 'right' },
  primary: { marginTop: SPACE.lg },
  home: { marginTop: SPACE.sm, marginBottom: SPACE.lg },
});
