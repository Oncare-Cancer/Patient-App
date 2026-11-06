import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { MapPin, Navigation, PhoneCall, ChevronRight } from 'lucide-react-native';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { GuestNav } from '@/components/guest/GuestNav';
import { useT } from '@/contexts/LanguageContext';
import { getCentres, type Centre } from '@/services/catalog';
import { PALETTE, SPACE, SURFACE, TEXT, TOUCH_MIN } from '@/constants/theme';

/**
 * Our centres, browsable without login (section 06: "Browse centres, addresses,
 * directions").
 *
 * City tabs rather than one list: the old build mixed Delhi and Bengaluru with
 * no filter, which is issue #6's companion complaint on the booking screen.
 */
export default function GuestCentres() {
  const t = useT();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const list = await getCentres();
      setCentres(list);
      setCity((prev) => prev ?? list[0]?.city ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cities = Array.from(new Set(centres.map((c) => c.city)));
  const shown = city ? centres.filter((c) => c.city === city) : centres;

  const openMaps = (c: Centre) => {
    const query =
      c.lat !== undefined && c.lng !== undefined
        ? `${c.lat},${c.lng}`
        : encodeURIComponent(`${c.name} ${c.address}`);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(
        () => {}
      );
    });
  };

  const call = (phone?: string) => {
    if (!phone) return;
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${phone}`).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.guest.ourCentres')} />

      <Screen withNav>
        {state === 'loading' ? (
          <SkeletonList count={5} lines={2} />
        ) : state === 'error' ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<MapPin size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : centres.length === 0 ? (
          <EmptyState
            icon={<MapPin size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.records.empty')}
          />
        ) : (
          <>
            {cities.length > 1 ? (
              <View style={styles.tabs}>
                {cities.map((c) => (
                  <Chip
                    key={c}
                    label={`${c} · ${centres.filter((x) => x.city === c).length}`}
                    latin
                    selected={city === c}
                    onPress={() => setCity(c)}
                  />
                ))}
              </View>
            ) : null}

            {shown.map((c) => (
              <Card key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.pin}>
                    <MapPin size={15} color={PALETTE.purple} strokeWidth={2.2} />
                  </View>
                  <View style={styles.flex}>
                    {/* Centre names and addresses are place data — Latin. */}
                    <Txt variant="bodyMedium" script="latin">
                      {c.name}
                    </Txt>
                  </View>
                  {/* Chevron, not a distance: the CMS stores no area field and
                      "use my location" was removed, so there is no distance to
                      show. The row opens the centre's detail page instead. */}
                  <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
                </View>

                <Txt
                  variant="helperSm"
                  color={TEXT.secondary}
                  script="latin"
                  style={styles.address}
                >
                  {c.address}
                </Txt>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => openMaps(c)}
                    accessibilityRole="button"
                    accessibilityLabel={t('ui.booking.directions')}
                    style={styles.action}
                  >
                    <Navigation size={13} color={PALETTE.midnight} strokeWidth={2.2} />
                    <Txt variant="helperSm">{t('ui.booking.directions')}</Txt>
                  </Pressable>

                  {c.phone ? (
                    <Pressable
                      onPress={() => call(c.phone)}
                      accessibilityRole="button"
                      accessibilityLabel={t('ui.booking.callCentre')}
                      style={styles.action}
                    >
                      <PhoneCall size={13} color={PALETTE.midnight} strokeWidth={2.2} />
                      <Txt variant="helperSm">{t('ui.booking.callCentre')}</Txt>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ))}
          </>
        )}
      </Screen>

      <GuestNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  flex: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.md,
  },
  card: {
    marginBottom: SPACE.sm,
    gap: SPACE.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: {
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.xxs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: SPACE.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
});

const _touch = TOUCH_MIN;
