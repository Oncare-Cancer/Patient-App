import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, MapPin, Search } from 'lucide-react-native';
import {
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
 */
export function CentreStep({
  locations,
  loading,
  selected,
  onSelect,
}: {
  locations: Location[];
  loading: boolean;
  selected: Location | null;
  /** Advances to the doctor step itself — there is no Continue button. */
  onSelect: (l: Location) => void;
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
    // Name plus area plus city, matching what the previous build searched.
    return items.filter((l) => locationSearchText(l).includes(q));
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
