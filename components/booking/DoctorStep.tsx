import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { CalendarCheck, Search, Stethoscope } from 'lucide-react-native';
import {
  Btn,
  Card,
  Chip,
  EmptyState,
  Field,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { Practitioner } from '@/services/booking';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/** "RS" from "Dr. Rakesh Sharma". */
function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/**
 * C2 — choose a doctor.
 *
 * The next free slot on each card is the fix for section 07's "Doctor cards show
 * no next available slot; patients have to tap through". There is no endpoint
 * for it, so the parent probes the slot list per doctor and passes the result in
 * `nextFree`. A doctor with no entry shows nothing rather than "no slots" —
 * unknown and unavailable are different things and only one of them is true.
 */
export function DoctorStep({
  doctors,
  loading,
  selected,
  onSelect,
  onContinue,
  onViewProfile,
  nextFree,
}: {
  doctors: Practitioner[];
  loading: boolean;
  selected: Practitioner | null;
  onSelect: (d: Practitioner) => void;
  onContinue: () => void;
  onViewProfile: (d: Practitioner) => void;
  /** practitionerId -> "Today 2:00 PM". Absent means not yet known. */
  nextFree: Record<string, string>;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [speciality, setSpeciality] = useState<string | null>(null);

  const specialities = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => d.speciality && set.add(String(d.speciality)));
    return Array.from(set);
  }, [doctors]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      if (speciality && d.speciality !== speciality) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        String(d.speciality ?? '').toLowerCase().includes(q)
      );
    });
  }, [doctors, query, speciality]);

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
      />

      {specialities.length > 0 ? (
        <View style={styles.chips}>
          <Chip
            label={t('ui.booking.all')}
            selected={speciality === null}
            onPress={() => setSpeciality(null)}
          />
          {specialities.map((s) => (
            <Chip
              key={s}
              label={s}
              latin
              selected={speciality === s}
              onPress={() => setSpeciality(speciality === s ? null : s)}
            />
          ))}
        </View>
      ) : null}

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
          const free = nextFree[d.id];
          return (
            <Pressable
              key={d.id}
              onPress={() => onSelect(d)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card tone="plain" selected={active} style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.avatar}>
                    <Txt variant="helper" script="latin" color={PALETTE.midnight}>
                      {initials(d.name)}
                    </Txt>
                  </View>

                  <View style={styles.meta}>
                    {/* Doctor name and speciality stay Latin. */}
                    <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
                      {d.name}
                    </Txt>
                    {d.speciality ? (
                      <Txt
                        variant="helperSm"
                        color={TEXT.muted}
                        script="latin"
                        numberOfLines={1}
                      >
                        {String(d.speciality)}
                      </Txt>
                    ) : null}
                  </View>

                  <View style={[styles.radio, active && styles.radioOn]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </View>

                {free ? (
                  <View style={styles.freeChip}>
                    <CalendarCheck size={11} color="#1B7A42" strokeWidth={2.4} />
                    <Txt variant="helperSm" color="#1B7A42" script="latin">
                      {t('ui.booking.nextFree')}: {free}
                    </Txt>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => onViewProfile(d)}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={styles.profileLink}
                >
                  <Txt variant="helperSm" color={PALETTE.deepBlue} style={styles.link}>
                    {t('ui.booking.viewProfile')}
                  </Txt>
                </Pressable>
              </Card>
            </Pressable>
          );
        })
      )}

      <Btn
        label={t('ui.common.continue')}
        onPress={onContinue}
        disabled={!selected}
        style={styles.continue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: SPACE.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  card: { marginBottom: SPACE.xs, gap: SPACE.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: PALETTE.purple },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: PALETTE.purple,
  },
  freeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EAF8EF',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  profileLink: { alignSelf: 'flex-start', minHeight: 26, justifyContent: 'center' },
  link: { textDecorationLine: 'underline' },
  continue: { marginTop: SPACE.lg, marginBottom: SPACE.lg },
  pressed: { opacity: 0.9 },
});

const _touch = TOUCH_MIN;
