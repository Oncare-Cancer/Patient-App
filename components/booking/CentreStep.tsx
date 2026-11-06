import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MapPin, Navigation, Search } from 'lucide-react-native';
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
import { groupByCity, type Location } from '@/services/booking';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * C1 — choose a centre.
 *
 * City tabs exist because the old list mixed Delhi and Bengaluru with no filter
 * (section 07). The city is derived from the location name — see
 * services/booking.ts — since the Docpulse payload has no city field.
 *
 * "Use my location" is offered but distance only appears once a centre carries
 * coordinates. The Docpulse location payload does not, so the button is wired
 * to the handler the parent supplies and the distance line stays absent rather
 * than showing a made-up number.
 */
export function CentreStep({
  locations,
  loading,
  selected,
  onSelect,
  onContinue,
  onUseLocation,
  locating,
}: {
  locations: Location[];
  loading: boolean;
  selected: Location | null;
  onSelect: (l: Location) => void;
  onContinue: () => void;
  onUseLocation: () => void;
  locating?: boolean;
}) {
  const t = useT();
  const [city, setCity] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => groupByCity(locations), [locations]);
  const activeCity = city ?? groups[0]?.city ?? null;

  const shown = useMemo(() => {
    const group = groups.find((g) => g.city === activeCity);
    const items = group?.items ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((l) =>
      `${l.name ?? ''} ${l.address ?? ''}`.toLowerCase().includes(q)
    );
  }, [groups, activeCity, query]);

  return (
    <View>
      <Txt variant="section" style={styles.title}>
        {t('ui.booking.chooseCentre')}
      </Txt>

      {groups.length > 1 ? (
        <View style={styles.tabs}>
          {groups.map((g) => (
            <Chip
              key={g.city}
              label={`${g.city} · ${g.items.length}`}
              latin
              selected={activeCity === g.city}
              onPress={() => setCity(g.city)}
            />
          ))}
        </View>
      ) : null}

      <Field
        icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
        placeholder={t('ui.booking.searchArea')}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        containerStyle={styles.search}
      />

      <Pressable
        onPress={onUseLocation}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.locateRow}
      >
        <Navigation size={13} color={PALETTE.purple} strokeWidth={2.4} />
        <Txt variant="helper" color={PALETTE.purple}>
          {locating ? t('ui.common.loading') : t('ui.booking.useMyLocation')}
        </Txt>
      </Pressable>

      {loading ? (
        <SkeletonList count={5} lines={1} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<MapPin size={22} color={PALETTE.purple} strokeWidth={2} />}
          title={t('ui.records.empty')}
        />
      ) : (
        shown.map((l, i) => {
          const active = selected?.id === l.id;
          const nearest = i === 0 && !query && l.distanceKm !== undefined;
          return (
            <Pressable
              key={l.id}
              onPress={() => onSelect(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card tone="plain" selected={active} style={styles.row}>
                <View style={styles.pin}>
                  <MapPin size={14} color={PALETTE.purple} strokeWidth={2.2} />
                </View>

                <View style={styles.meta}>
                  <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
                    {String(l.name)}
                  </Txt>
                  <Txt
                    variant="helperSm"
                    color={TEXT.muted}
                    script="latin"
                    numberOfLines={1}
                  >
                    {[
                      l.address ? String(l.address) : null,
                      nearest ? t('ui.home.nearest') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Txt>
                </View>

                {l.distanceKm !== undefined ? (
                  <Txt variant="helperSm" color={PALETTE.purple} script="latin">
                    {Number(l.distanceKm).toFixed(1)} km
                  </Txt>
                ) : null}

                <View style={[styles.radio, active && styles.radioOn]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
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
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  search: { marginBottom: SPACE.xs },
  locateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TOUCH_MIN,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
    minHeight: TOUCH_MIN + 10,
  },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  continue: { marginTop: SPACE.lg, marginBottom: SPACE.lg },
  pressed: { opacity: 0.9 },
});
