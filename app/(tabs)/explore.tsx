import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Building2, Search, Stethoscope } from 'lucide-react-native';
import {
  EmptyState,
  ErrorState,
  Field,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { CentreCard } from '@/components/explore/CentreCard';
import { DoctorCard } from '@/components/explore/DoctorCard';
import { useT } from '@/contexts/LanguageContext';
import { getCentres, type Centre } from '@/services/catalog';
import { doctorApi, type Doctor } from '@/services/doctors';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Explore — our centres and our specialists.
 *
 * This replaces Activity in the bottom bar (Activity moved into Profile, where
 * "my appointments and requests" belongs alongside the rest of the patient's
 * own records). Explore is browsing, which is what a tab is for.
 *
 * Both lists come from the CMS via `/app-centres` and `/app-doctors`, which
 * need no token — so this screen works for a guest as well as a signed-in
 * patient, and nothing here 401s.
 */
type Tab = 'centres' | 'doctors';

export default function Explore() {
  const t = useT();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('centres');
  const [centres, setCentres] = useState<Centre[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    // Both lists load together so switching tabs is instant, and one failing
    // does not blank the other.
    const [c, d] = await Promise.allSettled([getCentres(), doctorApi.list()]);

    if (c.status === 'fulfilled') setCentres(c.value);
    if (d.status === 'fulfilled') setDoctors(d.value);

    setState(
      c.status === 'rejected' && d.status === 'rejected' ? 'error' : 'ready'
    );
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const shownCentres = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return centres;
    return centres.filter((c) =>
      `${c.name} ${c.address} ${c.city}`.toLowerCase().includes(q)
    );
  }, [centres, query]);

  const shownDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      `${d.name} ${d.speciality ?? ''} ${d.location ?? ''} ${d.centres
        .map((c) => c.name)
        .join(' ')}`
        .toLowerCase()
        .includes(q)
    );
  }, [doctors, query]);

  const onCentres = tab === 'centres';

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('ui.explore.title')}
        subtitle={
          onCentres
            ? t('ui.explore.centreCount', { count: centres.length })
            : t('ui.explore.doctorCount', { count: doctors.length })
        }
      />

      <Screen withNav refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        void load();
      }}>
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('centres')}
            accessibilityRole="tab"
            accessibilityState={{ selected: onCentres }}
            style={[styles.tab, onCentres && styles.tabOn]}
          >
            <Txt
              variant="helper"
              color={onCentres ? PALETTE.midnight : TEXT.muted}
            >
              {t('ui.explore.tabCentres')}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => setTab('doctors')}
            accessibilityRole="tab"
            accessibilityState={{ selected: !onCentres }}
            style={[styles.tab, !onCentres && styles.tabOn]}
          >
            <Txt
              variant="helper"
              color={!onCentres ? PALETTE.midnight : TEXT.muted}
            >
              {t('ui.explore.tabDoctors')}
            </Txt>
          </Pressable>
        </View>

        <Field
          icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
          placeholder={
            onCentres
              ? t('ui.explore.searchCentres')
              : t('ui.explore.searchDoctors')
          }
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          containerStyle={styles.search}
        />

        {state === 'loading' ? (
          <SkeletonList count={5} lines={2} />
        ) : state === 'error' ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<Building2 size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : onCentres ? (
          shownCentres.length === 0 ? (
            <EmptyState
              icon={
                <Building2 size={22} color={PALETTE.purple} strokeWidth={2} />
              }
              title={t('ui.explore.noCentres')}
            />
          ) : (
            shownCentres.map((c) => (
              <CentreCard
                key={c.id}
                centre={c}
                onPress={() => router.push(`/centre/${c.id}`)}
              />
            ))
          )
        ) : shownDoctors.length === 0 ? (
          <EmptyState
            icon={
              <Stethoscope size={22} color={PALETTE.purple} strokeWidth={2} />
            }
            title={t('ui.explore.noDoctors')}
          />
        ) : (
          shownDoctors.map((d) => (
            <DoctorCard
              key={d.id}
              doctor={d}
              onPress={() => router.push(`/doctor/${d.id}`)}
            />
          ))
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  tabs: {
    flexDirection: 'row',
    backgroundColor: SURFACE.disabled,
    borderRadius: RADIUS.chip,
    padding: 3,
    marginBottom: SPACE.md,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.chip - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: SURFACE.card },
  search: { marginBottom: SPACE.md },
});
