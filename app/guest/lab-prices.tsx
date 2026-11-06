import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FlaskConical, Lock, MapPin, Search } from 'lucide-react-native';
import {
  ApproxPrice,
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  PriceNote,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { GuestNav } from '@/components/guest/GuestNav';
import { LoginSheet } from '@/components/guest/LoginSheet';
import { useT } from '@/contexts/LanguageContext';
import { searchLabTests, type LabTest } from '@/services/catalog';
import { useDebounced } from '@/hooks/useDebounced';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  NAV_CLEARANCE,
} from '@/constants/theme';

/**
 * B2 — approximate lab test prices, visible without login.
 *
 * The list is windowed and searched server-side: `labCosts` holds 17,447 live
 * rows, so neither fetching nor rendering them client-side is an option.
 *
 * Pincode sits in the header because price depends on it — the same KFT is ₹500
 * from a Delhi partner and ₹760 from a Bangalore one. Until a pincode is given
 * the list is unfiltered, which is honest rather than guessing a city.
 */
export default function GuestLabPrices() {
  const t = useT();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>('popular');
  const [pincode, setPincode] = useState('');
  const [items, setItems] = useState<LabTest[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const debouncedSearch = useDebounced(search, 350);
  const debouncedPincode = useDebounced(pincode, 500);

  const categories = useMemo(
    () => [
      { key: 'popular', label: t('ui.lab.popular') },
      { key: 'tumour', label: t('ui.lab.tumourMarkers') },
      { key: 'blood', label: t('ui.lab.blood') },
      { key: 'liverKidney', label: t('ui.lab.liverKidney') },
    ],
    [t]
  );

  const load = useCallback(
    async (reset: boolean) => {
      if (reset) setState('loading');
      else setLoadingMore(true);
      try {
        const page = await searchLabTests({
          search: debouncedSearch || undefined,
          // A text search should look across everything, not inside one chip.
          category: debouncedSearch ? undefined : category,
          pincode: debouncedPincode.length === 6 ? debouncedPincode : undefined,
          index: reset ? 0 : items.length,
          limit: 20,
        });
        setItems((prev) => (reset ? page.list : [...prev, ...page.list]));
        setTotal(page.totalCount);
        setState('ready');
      } catch {
        if (reset) setState('error');
      } finally {
        setLoadingMore(false);
      }
    },
    [debouncedSearch, category, debouncedPincode, items.length]
  );

  // Reload whenever the query changes. `load` is recreated on items.length too,
  // so the reset call is intentionally not in this dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load(true);
  }, [debouncedSearch, category, debouncedPincode]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('ui.guest.labTestPrices')}
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ui.lab.collectionAddress')}
            style={styles.pinChip}
          >
            <MapPin size={11} color={PALETTE.white} strokeWidth={2.4} />
            <Txt variant="helperSm" color={PALETTE.white} script="latin">
              {debouncedPincode.length === 6 ? debouncedPincode : '—'}
            </Txt>
          </Pressable>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Windowing keeps a 17k-row catalogue scrolling smoothly.
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (state === 'ready' && !loadingMore && items.length < total) {
            void load(false);
          }
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Field
              icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
              placeholder={t('ui.lab.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />

            <Field
              icon={<MapPin size={15} color={TEXT.muted} strokeWidth={2} />}
              placeholder="Pincode"
              value={pincode}
              onChangeText={(v) => setPincode(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              containerStyle={styles.pinField}
            />

            <View style={styles.chips}>
              {categories.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  latin
                  selected={!search && category === c.key}
                  onPress={() => {
                    setSearch('');
                    setCategory(category === c.key ? undefined : c.key);
                  }}
                />
              ))}
            </View>

            {/* Section 06: the note sits above every price list. */}
            <PriceNote />
          </View>
        }
        renderItem={({ item }) => (
          <Card tone="plain" style={styles.row}>
            <View style={styles.rowMeta}>
              {/* Test names are clinical tokens — Latin in both languages. */}
              <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
                {item.displayName}
              </Txt>
              <View style={styles.rowSub}>
                {item.tat ? (
                  <Txt variant="helperSm" color={TEXT.muted}>
                    {t('ui.lab.reportIn', { time: item.tat })}
                  </Txt>
                ) : null}
                {item.homeCollection ? (
                  <View style={styles.homeTag}>
                    <Txt variant="helperSm" color="#1B7A42">
                      {t('ui.lab.homeCollection')}
                    </Txt>
                  </View>
                ) : null}
              </View>
            </View>
            <ApproxPrice value={item.price} />
          </Card>
        )}
        ListEmptyComponent={
          state === 'loading' ? (
            <SkeletonList count={6} lines={1} />
          ) : state === 'error' ? (
            <ErrorState
              onRetry={() => void load(true)}
              icon={<FlaskConical size={22} color={PALETTE.purple} strokeWidth={2} />}
            />
          ) : (
            <EmptyState
              icon={<FlaskConical size={22} color={PALETTE.purple} strokeWidth={2} />}
              title={t('ui.records.empty')}
              body={t('ui.lab.missingTest')}
            />
          )
        }
        // `undefined`, not `null`: React Native 0.88 narrowed this prop's type
        // and no longer accepts null.
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <SkeletonList count={2} lines={1} />
            </View>
          ) : undefined
        }
      />

      <View style={styles.cta}>
        <Btn
          label={t('ui.guest.loginToBookTests')}
          onPress={() => setLoginOpen(true)}
          icon={<Lock size={14} color={PALETTE.white} strokeWidth={2.2} />}
        />
      </View>

      <LoginSheet
        visible={loginOpen}
        intent={{
          kind: 'labTests',
          summary: t('ui.guest.labTestPrices'),
          pincode: debouncedPincode.length === 6 ? debouncedPincode : undefined,
          // Browsing prices selects nothing, so there are no test ids to keep —
          // the pincode is what the patient would otherwise retype.
          testIds: [],
        }}
        onClose={() => setLoginOpen(false)}
        onLogin={() => {
          setLoginOpen(false);
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
  listContent: {
    paddingHorizontal: SPACE.gutter,
    paddingBottom: NAV_CLEARANCE + 72,
  },
  header: {
    paddingTop: SPACE.lg,
    gap: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  pinField: {
    marginTop: -SPACE.xxs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
  },
  pinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  rowMeta: {
    flex: 1,
  },
  rowSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  homeTag: {
    backgroundColor: '#EAF8EF',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  footer: {
    marginTop: SPACE.xs,
  },
  cta: {
    position: 'absolute',
    left: SPACE.gutter,
    right: SPACE.gutter,
    bottom: NAV_CLEARANCE + SPACE.xs,
  },
});
