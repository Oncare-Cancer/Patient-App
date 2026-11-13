import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, LocateFixed, MapPin, Search } from 'lucide-react-native';
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
import {
  groupByCity,
  locationSearchText,
  type Location,
} from '@/services/booking';
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
 * Tapping a centre advances straight to the doctor step; there is no Continue
 * button, because picking one of a list of nine is unambiguous and a second tap
 * to confirm it only lengthens the flow section 07 already called too long.
 *
 * City tabs exist because the old list mixed Delhi and Bengaluru with no
 * filter.
 *
 * Round 7: this is the MANUAL path. Book normally opens straight on the
 * nearest centre's doctors (or the patient's last centre); the patient lands
 * here when they tap "Change centre", turn location down, or are more than
 * 50 km from every centre. With a location, each row shows its distance,
 * rows are nearest-first and the nearest centre's city is pre-selected.
 */
export function CentreStep({
  locations,
  loading,
  selected,
  onSelect,
  distances,
  notice,
  onUseLocation,
  locating,
}: {
  locations: Location[];
  loading: boolean;
  selected: Location | null;
  /** Advances to the doctor step itself — there is no Continue button. */
  onSelect: (l: Location) => void;
  /** locationId -> km from the patient, when their location is known. */
  distances?: Record<string, number>;
  /** Why the patient is choosing by hand, e.g. "Location is off". */
  notice?: string;
  /** Offered when there is no location yet; asks the OS again on tap. */
  onUseLocation?: () => void;
  locating?: boolean;
}) {
  const t = useT();
  const [city, setCity] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => groupByCity(locations), [locations]);
  const hasDistances = !!distances && Object.keys(distances).length > 0;

  // With a location, open on the city of the nearest centre, not on whichever
  // city happens to sort first.
  const nearestCity = useMemo(() => {
    if (!hasDistances) return null;
    let best: { city: string; km: number } | null = null;
    for (const g of groups) {
      for (const l of g.items) {
        const km = distances![l.id];
        if (km !== undefined && (!best || km < best.km)) best = { city: g.city, km };
      }
    }
    return best?.city ?? null;
  }, [groups, distances, hasDistances]);

  const activeCity = city ?? nearestCity ?? groups[0]?.city ?? null;

  const shown = useMemo(() => {
    const group = groups.find((g) => g.city === activeCity);
    let items = group?.items ?? [];
    const q = query.trim().toLowerCase();
    // Name plus area plus city, matching what the previous build searched.
    if (q) items = items.filter((l) => locationSearchText(l).includes(q));
    if (hasDistances) {
      items = [...items].sort(
        (a, b) => (distances![a.id] ?? Infinity) - (distances![b.id] ?? Infinity)
      );
    }
    return items;
  }, [groups, activeCity, query, distances, hasDistances]);

  return (
    <View>
      <Txt variant="section" style={styles.title}>
        {groups.length > 1 ? t('ui.booking.chooseCity') : t('ui.booking.chooseCentre')}
      </Txt>

      {notice ? (
        <Card tone="info" style={styles.notice}>
          <Txt variant="helperSm" color={TEXT.secondary}>
            {notice}
          </Txt>
          {onUseLocation ? (
            <Btn
              label={t('ui.booking.useMyLocation')}
              variant="secondary"
              compact
              block={false}
              loading={locating}
              onPress={onUseLocation}
              icon={<LocateFixed size={14} color={PALETTE.midnight} strokeWidth={2.2} />}
              style={styles.locBtn}
            />
          ) : null}
        </Card>
      ) : null}

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

      {loading ? (
        <SkeletonList count={5} lines={1} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<MapPin size={22} color={PALETTE.purple} strokeWidth={2} />}
          title={t('ui.records.empty')}
        />
      ) : (
        shown.map((l) => {
          const active = selected?.id === l.id;
          return (
            <Pressable
              key={l.id}
              onPress={() => onSelect(l)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card tone="plain" selected={active} style={styles.row}>
                <View style={styles.pin}>
                  <MapPin size={14} color={PALETTE.purple} strokeWidth={2.2} />
                </View>

                <View style={styles.meta}>
                  {/* `label` is "name, area". Docpulse gives every centre the
                      same `name`, so area is what tells them apart. */}
                  <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
                    {l.label}
                  </Txt>
                  {l.city && l.city !== l.area ? (
                    <Txt
                      variant="helperSm"
                      color={TEXT.muted}
                      script="latin"
                      numberOfLines={1}
                    >
                      {String(l.city)}
                    </Txt>
                  ) : null}
                </View>

                {distances?.[l.id] !== undefined ? (
                  <Txt variant="helperSm" color={TEXT.muted} script="latin">
                    {t('ui.booking.kmAway', { km: distances[l.id] })}
                  </Txt>
                ) : null}
                <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
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
  notice: { gap: SPACE.sm, marginBottom: SPACE.md },
  locBtn: { alignSelf: 'flex-start' },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  search: { marginBottom: SPACE.md },
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
  pressed: { opacity: 0.9 },
});

const _touch = TOUCH_MIN;
