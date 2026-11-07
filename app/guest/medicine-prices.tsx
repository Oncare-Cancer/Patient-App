import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Pill, Search } from 'lucide-react-native';
import {
  Btn,
  Card,
  EmptyState,
  ErrorState,
  Field,
  PriceNote,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { MedicineCard } from '@/components/services/MedicineCard';
import { GuestNav } from '@/components/guest/GuestNav';
import { LoginSheet } from '@/components/guest/LoginSheet';
import { useT } from '@/contexts/LanguageContext';
import { searchMedicines, type Medicine } from '@/services/catalog';
import { useDebounced } from '@/hooks/useDebounced';
import {
  NAV_CLEARANCE,
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * B3 — approximate medicine prices, visible without login.
 *
 * Shows MRP, which is the patient-facing number; `costPrice` is Oncare's buy
 * price and never leaves the backend. 2,584 of 3,132 live medicines have an MRP;
 * the rest render as "Price on confirmation".
 */
export default function GuestMedicinePrices() {
  const t = useT();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const debounced = useDebounced(search, 350);

  const load = useCallback(
    async (reset: boolean) => {
      if (reset) setState('loading');
      else setLoadingMore(true);
      try {
        const page = await searchMedicines({
          search: debounced || undefined,
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
    [debounced, items.length]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load(true);
  }, [debounced]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('ui.guest.medicinePrices')}
        subtitle="Oncare Pharmacy"
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
              placeholder={t('ui.medicine.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {state === 'ready' ? (
              <Txt variant="helperSm" color={TEXT.muted}>
                {t('ui.guest.resultsCount', { count: total })}
              </Txt>
            ) : null}
            <PriceNote />
          </View>
        }
        renderItem={({ item }) => <MedicineCard medicine={item} />}
        ListEmptyComponent={
          state === 'loading' ? (
            <SkeletonList count={6} lines={1} />
          ) : state === 'error' ? (
            <ErrorState
              onRetry={() => void load(true)}
              icon={<Pill size={22} color={PALETTE.purple} strokeWidth={2} />}
            />
          ) : (
            <EmptyState
              icon={<Pill size={22} color={PALETTE.purple} strokeWidth={2} />}
              title={t('ui.records.empty')}
            />
          )
        }
        ListFooterComponent={
          <>
            {loadingMore ? <SkeletonList count={2} lines={1} /> : null}
            {state === 'ready' && items.length > 0 ? (
              <Card tone="info" style={styles.howTo}>
                <Txt variant="helper">{t('ui.guest.howToOrder')}</Txt>
                <Txt variant="helperSm" color={TEXT.secondary}>
                  1 · {t('ui.login.login')}
                  {'   '}2 · {t('ui.medicine.uploadPrescription')}
                  {'   '}3 · {t('ui.medicine.next2')}
                </Txt>
              </Card>
            ) : null}
          </>
        }
      />

      <View style={styles.cta}>
        <Btn
          label={t('ui.guest.loginToOrder')}
          onPress={() => setLoginOpen(true)}
          icon={<Lock size={14} color={PALETTE.white} strokeWidth={2.2} />}
        />
      </View>

      <LoginSheet
        visible={loginOpen}
        intent={{
          kind: 'medicines',
          summary: t('ui.guest.medicinePrices'),
          medicineIds: [],
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
  howTo: {
    marginTop: SPACE.sm,
    gap: SPACE.xxs,
  },
  cta: {
    position: 'absolute',
    left: SPACE.gutter,
    right: SPACE.gutter,
    bottom: NAV_CLEARANCE + SPACE.xs,
  },
});
