import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search as SearchIcon } from 'lucide-react-native';
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
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Search across doctors and centres.
 *
 * The home screen's search box used to be a button dressed as an input: it had
 * no text field and tapping it threw you into the booking flow. This is the
 * real thing — type, see matching doctors and centres, tap one to open it.
 *
 * Both lists come from the token-free catalogue endpoints, so this works for a
 * guest as well as a signed-in patient. Everything is filtered client-side
 * because the whole catalogue is 9 centres and 47 doctors: one fetch is far
 * cheaper than a request per keystroke, and it makes typing instant.
 */
export default function SearchScreen() {
  const t = useT();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [centres, setCentres] = useState<Centre[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    const [c, d] = await Promise.allSettled([getCentres(), doctorApi.list()]);
    if (c.status === 'fulfilled') setCentres(c.value);
    if (d.status === 'fulfilled') setDoctors(d.value);
    setState(
      c.status === 'rejected' && d.status === 'rejected' ? 'error' : 'ready'
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();

  const matchedDoctors = useMemo(() => {
    if (!q) return [];
    return doctors.filter((d) =>
      // Speciality is included so "oncology" or "radiation" finds people, which
      // is what the old placeholder's "cancer type" was reaching for.
      `${d.name} ${d.speciality ?? ''} ${d.location ?? ''} ${d.centres
        .map((c) => c.name)
        .join(' ')}`
        .toLowerCase()
        .includes(q)
    );
  }, [doctors, q]);

  const matchedCentres = useMemo(() => {
    if (!q) return [];
    return centres.filter((c) =>
      `${c.name} ${c.address} ${c.city}`.toLowerCase().includes(q)
    );
  }, [centres, q]);

  const total = matchedDoctors.length + matchedCentres.length;

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.home.searchTitle')} back />

      <Screen withNav>
        <Field
          icon={<SearchIcon size={15} color={TEXT.muted} strokeWidth={2} />}
          placeholder={t('ui.home.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          containerStyle={styles.search}
        />

        {state === 'loading' ? (
          <SkeletonList count={4} lines={2} />
        ) : state === 'error' ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<SearchIcon size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : !q ? (
          // Before anything is typed, say what is searchable rather than
          // showing an empty-results state that implies a failed search.
          <Txt variant="helperSm" color={TEXT.muted} center style={styles.hint}>
            {t('ui.home.searchHint', {
              doctors: doctors.length,
              centres: centres.length,
            })}
          </Txt>
        ) : total === 0 ? (
          <EmptyState
            icon={<SearchIcon size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.home.searchNoResults')}
          />
        ) : (
          <>
            {matchedDoctors.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.tabDoctors')} · {matchedDoctors.length}
                </Txt>
                {matchedDoctors.map((d) => (
                  <DoctorCard
                    key={d.id}
                    doctor={d}
                    onPress={() => router.push(`/doctor/${d.id}`)}
                  />
                ))}
              </>
            ) : null}

            {matchedCentres.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.tabCentres')} · {matchedCentres.length}
                </Txt>
                {matchedCentres.map((c) => (
                  <CentreCard
                    key={c.id}
                    centre={c}
                    onPress={() => router.push(`/centre/${c.id}`)}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  search: { marginBottom: SPACE.md },
  heading: { marginTop: SPACE.sm, marginBottom: SPACE.sm },
  hint: { marginTop: SPACE.xl, lineHeight: 18 },
});
