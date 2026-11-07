import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { Award, ChevronRight, MapPin, User } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { Doctor } from '@/services/doctors';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * One doctor in a list, used by Explore, the centre detail page, search and
 * the guest doctors screen.
 *
 * Shared so a doctor looks identical everywhere. The rounded-rectangle photo
 * matches the booking flow's card for the same reason it was changed there:
 * these are head-and-shoulders portraits that a small circular mask crops
 * badly.
 *
 * WHAT CHANGED AND WHY
 * The first version stacked four lines of grey text and hung an underlined
 * "View profile" off the bottom-left corner. Three things were wrong with it:
 *
 *  - speciality is the thing a patient scans this list FOR, and it read as
 *    the same weight as everything else. It is now a tinted chip.
 *  - the centres were joined with "·" on one clipped line, so a doctor at
 *    three sites showed "Gurugram · Noida · Kalyan N…". Now the first centre
 *    is named and the rest become "+2 more", which fits and still says there
 *    are more.
 *  - "View profile" was an underlined fragment that did not look like a
 *    control, and sat next to a chevron that already meant the same thing. It
 *    is now one footer row, divided off, with the chevron in it — a single
 *    affordance instead of two half ones.
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
  const extraCentres = centres.length - 1;

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
              <View style={styles.specialityChip}>
                <Txt
                  variant="helperSm"
                  color={PALETTE.purple}
                  script="latin"
                  numberOfLines={1}
                >
                  {doctor.speciality}
                </Txt>
              </View>
            ) : null}

            {doctor.experience ? (
              <View style={styles.expRow}>
                <Award size={11} color={TEXT.muted} strokeWidth={2.2} />
                {/* Stored already carrying its unit ("18+ Years"), so nothing
                    is appended here. */}
                <Txt
                  variant="helperSm"
                  color={TEXT.muted}
                  script="latin"
                  numberOfLines={1}
                >
                  {doctor.experience}
                </Txt>
              </View>
            ) : null}

            {showCentres && centres.length > 0 ? (
              <View style={styles.centreRow}>
                <MapPin size={11} color={TEXT.secondary} strokeWidth={2.2} />
                <Txt
                  variant="helperSm"
                  color={TEXT.secondary}
                  script="latin"
                  numberOfLines={1}
                  style={styles.flex}
                >
                  {centres[0]}
                </Txt>
                {extraCentres > 0 ? (
                  <View style={styles.moreChip}>
                    <Txt variant="helperSm" color={TEXT.secondary} script="latin">
                      {t('ui.explore.moreCentres', { count: extraCentres })}
                    </Txt>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/*
          One footer, one meaning. The label changes with what the tap actually
          does: a doctor with no website record has no profile to open, so the
          card books instead — saying "View profile" there would be a promise
          the next screen cannot keep.
        */}
        <View style={styles.footer}>
          <Txt variant="helper" color={PALETTE.deepBlue}>
            {doctor.hasProfile
              ? t('ui.explore.viewProfile')
              : t('ui.explore.bookNow')}
          </Txt>
          <ChevronRight size={15} color={PALETTE.deepBlue} strokeWidth={2.4} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACE.sm, gap: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // A hairline keeps a pale portrait from bleeding into the card.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SURFACE.border,
  },
  photo: { width: '100%', height: '100%' },
  meta: { flex: 1, gap: SPACE.xxs },
  flex: { flex: 1 },
  specialityChip: {
    alignSelf: 'flex-start',
    backgroundColor: SURFACE.tint,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  centreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreChip: {
    backgroundColor: SURFACE.disabled,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
    paddingTop: SPACE.xs,
  },
  pressed: { opacity: 0.9 },
});
