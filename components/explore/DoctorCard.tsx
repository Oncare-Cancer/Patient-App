import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { ChevronRight, MapPin, User } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { Doctor } from '@/services/doctors';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * One doctor in a list, used by Explore, the centre detail page and the guest
 * doctors screen.
 *
 * Shared so a doctor looks identical everywhere. The 72px rounded-rectangle
 * photo matches the booking flow's card for the same reason it was changed
 * there: these are head-and-shoulders portraits that a small circular mask
 * crops badly.
 *
 * `showCentres` is off inside a centre's own page, where naming the centre on
 * every card would just repeat the page title.
 */
export function DoctorCard({
  doctor,
  onPress,
  showCentres = true,
}: {
  doctor: Doctor;
  onPress: () => void;
  showCentres?: boolean;
}) {
  const t = useT();
  const centres = doctor.centres.map((c) => c.name).filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${doctor.name}${
        doctor.speciality ? `, ${doctor.speciality}` : ''
      }`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card tone="plain" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            {doctor.img ? (
              <Image
                source={{ uri: doctor.img }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel={doctor.imgAlt ?? doctor.name}
              />
            ) : (
              <User size={28} color={PALETTE.purple} strokeWidth={2} />
            )}
          </View>

          <View style={styles.meta}>
            {/* Names, specialities and experience stay Latin. */}
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
                {doctor.speciality}
              </Txt>
            ) : null}
            {doctor.experience ? (
              // Stored already carrying its unit ("18+ Years"), so nothing is
              // appended here.
              <Txt
                variant="helperSm"
                color={TEXT.muted}
                script="latin"
                numberOfLines={1}
              >
                {doctor.experience}
              </Txt>
            ) : null}

            {showCentres && centres.length > 0 ? (
              <View style={styles.centreRow}>
                <MapPin size={11} color={PALETTE.purple} strokeWidth={2.4} />
                <Txt
                  variant="helperSm"
                  color={PALETTE.purple}
                  script="latin"
                  numberOfLines={1}
                  style={styles.flex}
                >
                  {centres.join(' · ')}
                </Txt>
              </View>
            ) : null}
          </View>

          <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
        </View>

        {doctor.hasProfile ? (
          <Txt variant="helperSm" color={PALETTE.deepBlue} style={styles.link}>
            {t('ui.explore.viewProfile')}
          </Txt>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACE.sm, gap: SPACE.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
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
  meta: { flex: 1, gap: 1 },
  flex: { flex: 1 },
  centreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACE.xxs,
  },
  link: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.9 },
});
