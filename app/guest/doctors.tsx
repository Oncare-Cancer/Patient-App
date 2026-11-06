import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Stethoscope } from 'lucide-react-native';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
  Btn,
} from '@/components/ui';
import { GuestNav } from '@/components/guest/GuestNav';
import { LoginSheet } from '@/components/guest/LoginSheet';
import { useT } from '@/contexts/LanguageContext';
import { useDebounced } from '@/hooks/useDebounced';
import { doctorApi, type Doctor } from '@/services/doctors';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Doctor browse for guests.
 *
 * Section 06 allows "Search doctors, view profiles, see free slots" without a
 * session and only locks the confirm step, so this screen is fully open and the
 * login sheet appears when a patient tries to book — carrying the doctor they
 * picked so nothing is lost (B5/B6).
 */
export default function GuestDoctors() {
  const t = useT();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [speciality, setSpeciality] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [picked, setPicked] = useState<Doctor | null>(null);

  const debounced = useDebounced(search, 300);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setDoctors(await doctorApi.list());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const specialities = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => d.speciality && set.add(d.speciality));
    return Array.from(set);
  }, [doctors]);

  const shown = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return doctors.filter((d) => {
      if (speciality && d.speciality !== speciality) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.speciality ?? '').toLowerCase().includes(q)
      );
    });
  }, [doctors, speciality, debounced]);

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.booking.chooseDoctor')} />

      <Screen withNav>
        <Field
          icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
          placeholder={t('ui.booking.searchDoctor')}
          value={search}
          onChangeText={setSearch}
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
                onPress={() => setSpeciality(s)}
              />
            ))}
          </View>
        ) : null}

        {state === 'loading' ? (
          <SkeletonList count={5} lines={2} />
        ) : state === 'error' ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<Stethoscope size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<Stethoscope size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.records.empty')}
          />
        ) : (
          shown.map((d) => (
            <Card key={d.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Txt variant="helper" script="latin" color={PALETTE.midnight}>
                    {d.name
                      .replace(/^Dr\.?\s*/i, '')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </Txt>
                </View>
                <View style={styles.meta}>
                  {/* Doctor names and specialities stay Latin. */}
                  <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
                    {d.name}
                  </Txt>
                  <Txt
                    variant="helperSm"
                    color={TEXT.muted}
                    script="latin"
                    numberOfLines={1}
                  >
                    {[d.speciality, d.experienceLabel].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
              </View>

              <Btn
                label={t('ui.nav.book')}
                variant="secondary"
                compact
                onPress={() => setPicked(d)}
                style={styles.bookBtn}
              />
            </Card>
          ))
        )}
      </Screen>

      <LoginSheet
        visible={picked !== null}
        savedSelection={picked?.name}
        title={t('ui.login.loginToConfirm')}
        intent={
          picked
            ? {
                kind: 'booking',
                summary: picked.name,
                doctorId: picked.id,
                doctorName: picked.name,
              }
            : undefined
        }
        onClose={() => setPicked(null)}
        onLogin={() => {
          setPicked(null);
          router.replace('/login');
        }}
      />

      <GuestNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
    marginBottom: SPACE.md,
  },
  card: {
    marginBottom: SPACE.sm,
    gap: SPACE.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  bookBtn: {
    alignSelf: 'flex-start',
  },
});
