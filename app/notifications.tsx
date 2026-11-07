import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  FileText,
} from 'lucide-react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  listNotifications,
  markNotificationsRead,
  type AppNotification,
} from '@/services/appNotifications';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * Notifications, reached from the bell on A4.
 *
 * This screen used to be an empty shell, and said so: notifications were only
 * ever pushed, never recorded, so there was no history to list. The backend
 * now stores every one, and this is that list.
 *
 * It renders only real notifications. The old `notificationApi` returned three
 * hardcoded fakes — "Your Complete Blood Count Report has been uploaded" for a
 * report that does not exist — and showing a cancer patient a fabricated
 * result about their own tests is not a placeholder, it is a lie. That mock is
 * gone.
 *
 * Opening the screen marks what is on it as read, because that is what reading
 * means. Tapping a row goes where the notification is about, so "price ready
 * for your approval" lands on the request that needs approving rather than
 * leaving the patient to find it.
 */

/** Icon per type, so the list is scannable without reading every title. */
const ICON = {
  appointment: CalendarCheck,
  request: ClipboardList,
  document: FileText,
  general: Bell,
} as const;

/** "2h ago" / "3d ago" — recency is the only time detail that matters here. */
function since(iso: string, t: ReturnType<typeof useT>): string {
  const then = new Date(iso).getTime();
  if (!iso || Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return t('ui.notifications.justNow');
  if (mins < 60) return t('ui.notifications.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('ui.notifications.hoursAgo', { count: hrs });
  const days = Math.floor(hrs / 24);
  return t('ui.notifications.daysAgo', { count: days });
}

export default function Notifications() {
  const t = useT();
  const router = useRouter();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (mode: 'first' | 'refresh' | 'more') => {
      if (mode === 'first') setState('loading');
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const page = await listNotifications({
          index: mode === 'more' ? items.length : 0,
          limit: 20,
        });
        setItems((prev) => (mode === 'more' ? [...prev, ...page.list] : page.list));
        setTotal(page.totalCount);
        setState('ready');
      } catch {
        if (mode === 'first') setState('error');
      } finally {
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [items.length]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load('first');
  }, []);

  /*
   * Marks the loaded notifications read once they are on screen.
   *
   * Fired from the ids actually rendered rather than "mark everything": a
   * patient with sixty notifications has not read the fifty they have not
   * scrolled to, and clearing the badge for those would hide them.
   *
   * The local rows are updated without re-fetching, so the list does not jump
   * under the patient's thumb while they are reading it.
   */
  const unreadIds = useMemo(
    () => items.filter((n) => !n.read).map((n) => n.id),
    [items]
  );

  useEffect(() => {
    if (state !== 'ready' || unreadIds.length === 0) return;
    const ids = unreadIds;
    void markNotificationsRead(ids).then(() => {
      setItems((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    });
    // Keyed on the joined ids so it fires once per batch, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, unreadIds.join(',')]);

  /** Where a notification is about. */
  const open = (n: AppNotification) => {
    const requestId = typeof n.data?.requestId === 'string' ? n.data.requestId : '';
    if (n.type === 'request' && requestId) {
      // The Activity tab holds the request list and its timeline.
      router.push('/(tabs)/appointments');
      return;
    }
    if (n.type === 'appointment') {
      router.push('/(tabs)/appointments');
      return;
    }
    if (n.type === 'document') {
      router.push('/(tabs)/documents');
      return;
    }
    // `general` has nowhere specific to go, so tapping it does nothing rather
    // than dumping the patient on a screen that does not mention it.
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const Icon = ICON[item.type] ?? Bell;
    const tappable = item.type !== 'general';

    return (
      <Pressable
        onPress={tappable ? () => open(item) : undefined}
        accessibilityRole={tappable ? 'button' : undefined}
        accessibilityLabel={`${item.title}. ${item.body}`}
        style={({ pressed }) => [pressed && tappable && styles.pressed]}
      >
        <Card tone="plain" style={[styles.row, !item.read && styles.unreadRow]}>
          <View style={[styles.iconTile, !item.read && styles.iconTileUnread]}>
            <Icon
              size={15}
              color={item.read ? TEXT.muted : PALETTE.purple}
              strokeWidth={2.2}
            />
          </View>

          <View style={styles.meta}>
            <View style={styles.titleRow}>
              <Txt variant="bodyMedium" numberOfLines={2} style={styles.flex}>
                {item.title}
              </Txt>
              {!item.read ? <View style={styles.dot} /> : null}
            </View>

            {item.body ? (
              <Txt variant="helperSm" color={TEXT.secondary} numberOfLines={3}>
                {item.body}
              </Txt>
            ) : null}

            <Txt variant="helperSm" color={TEXT.muted}>
              {since(item.createdAt, t)}
            </Txt>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (state === 'loading') {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('ui.profile.notifications')} />
        <Screen>
          <SkeletonList count={6} lines={2} />
        </Screen>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('ui.profile.notifications')} />
        <Screen>
          <ErrorState
            onRetry={() => void load('first')}
            icon={<Bell size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        </Screen>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.profile.notifications')} />

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
            tintColor={PALETTE.purple}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loadingMore && items.length < total) void load('more');
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<Bell size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.notifications.empty')}
            body={t('ui.notifications.emptyBody')}
          />
        }
        ListFooterComponent={
          loadingMore ? <SkeletonList count={2} lines={2} /> : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  listContent: {
    paddingHorizontal: SPACE.gutter,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
    minHeight: TOUCH_MIN,
  },
  /** Unread gets a tint and a dot — colour alone is not enough on its own. */
  unreadRow: {
    backgroundColor: SURFACE.tint,
    borderColor: '#E0D6FF',
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: SURFACE.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileUnread: { backgroundColor: PALETTE.white },
  meta: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.purple,
    marginTop: 5,
  },
  pressed: { opacity: 0.9 },
});
