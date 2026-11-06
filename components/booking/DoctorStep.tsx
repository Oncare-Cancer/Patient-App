import React, { useMemo, useState } from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import {
  CalendarCheck,
  ChevronRight,
  Search,
  Stethoscope,
  User,
} from 'lucide-react-native';
import { Card, EmptyState, Field, SkeletonList, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { Practitioner } from '@/services/booking';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * C2 — choose a doctor.
 *
 * The card shows what the previous build showed and this screen briefly lost:
 * the CMS photo, the name built from firstName + lastName, the speciality and
 * the experience string. None of that lives on the Docpulse practitioner
 * record — it comes from the `doctorDetails` object the backend joins on — so
 * reading a `name` field produced blank cards.
 *
 * The photo is 72px and square-cornered rather than a 46px circle: these are
 * real portraits and a doctor's face is the thing a patient recognises, so it
 * gets the space. A circle that small cropped most of the head.
 *
 * "Next available" is a plain label, not a looked-up time. Fetching each
 * doctor's earliest free slot meant one slot request per doctor on a screen the
 * patient is only skimming, and the number went stale as soon as it rendered.
 * The real times are one tap away on the next step.
 *
 * "View profile" only appears when the CMS actually has a record, because the
 * profile modal has nothing to render otherwise.
 */
export function DoctorStep({
  doctors,
  loading,
  selected,
  onSelect,
  onViewProfile,
}: {
  doctors: Practitioner[];
  loading: boolean;
  selected: Practitioner | null;
  /** Advances to the slot step itself — there is no Continue button. */
  onSelect: (d: Practitioner) => void;
  onViewProfile: (d: Practitioner) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      `${d.name} ${d.speciality ?? ''}`.toLowerCase().includes(q)
    );
  }, [doctors, query]);

  return (
    <View>
      <Txt variant="section" style={styles.title}>
        {t('ui.booking.chooseDoctor')}
      </Txt>

      <Field
        icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
        placeholder={t('ui.booking.searchDoctor')}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        containerStyle={styles.search}
      />

      {loading ? (
        <SkeletonList count={4} lines={2} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={22} color={PALETTE.purple} strokeWidth={2} />}
          title={t('ui.records.empty')}
        />
      ) : (
        shown.map((d) => {
          const active = selected?.id === d.id;
          return (
            <Pressable
              key={d.id}
              onPress={() => onSelect(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${d.name}${d.speciality ? `, ${d.speciality}` : ''}`}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card tone="plain" selected={active} style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.avatar}>
                    {d.img ? (
                      <Image
                        source={{ uri: d.img }}
                        style={styles.photo}
                        resizeMode="cover"
                        accessibilityLabel={d.name}
                      />
                    ) : (
                      <User size={28} color={PALETTE.purple} strokeWidth={2} />
                    )}
                  </View>

                  <View style={styles.meta}>
                    {/* Doctor name, speciality and experience stay Latin. */}
                    <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
                      {d.name}
                    </Txt>
                    {d.speciality ? (
                      <Txt
                        variant="helperSm"
                        color={TEXT.secondary}
                        script="latin"
                        numberOfLines={2}
                      >
                        {d.speciality}
                      </Txt>
                    ) : null}
                    {d.experience ? (
                      // Rendered exactly as the CMS stores it ("11+ Years").
                      // Appending "years of experience" here is issue #7.
                      <Txt
                        variant="helperSm"
                        color={TEXT.muted}
                        script="latin"
                        numberOfLines={1}
                      >
                        {d.experience}
                      </Txt>
                    ) : null}

                    <View style={styles.availRow}>
                      <CalendarCheck size={11} color="#1B7A42" strokeWidth={2.4} />
                      <Txt variant="helperSm" color="#1B7A42">
                        {t('ui.booking.nextAvailable')}
                      </Txt>
                    </View>
                  </View>

                  <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
                </View>

                {/* Only when the CMS has a record to show. */}
                {d.hasProfile ? (
                  <Pressable
                    onPress={() => onViewProfile(d)}
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
              </Card>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: SPACE.sm },
  search: { marginBottom: SPACE.md },
  card: { marginBottom: SPACE.sm, gap: SPACE.xs },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  avatar: {
    width: 72,
    height: 72,
    // Rounded rectangle, not a circle: portraits are framed head-and-shoulders
    // and a circular mask at this size cut off the top of the head.
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  meta: { flex: 1, gap: 1 },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACE.xxs,
  },
  profileLink: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  link: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.9 },
});
