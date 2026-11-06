import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import {
  CalendarDays,
  MapPin,
  Navigation,
  Inbox,
} from 'lucide-react-native';
import {
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatusBadge,
  Txt,
} from '@/components/ui';
import { RequestCard } from '@/components/activity/RequestCard';
import { RescheduleSheet } from '@/components/activity/RescheduleSheet';
import { useT } from '@/contexts/LanguageContext';
import {
  listAppointments,
  cancelAppointment,
  bucketOf,
  centreName,
  doctorName,
  formatWhen,
  type Appointment,
  type ApptBucket,
} from '@/services/appointments';
import {
  listRequests,
  confirmRequestPrice,
  type OpsRequest,
} from '@/services/requests';
import { SUPPORT_NUMBER } from '@/constants/contact';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * D1 + H3 — Activity.
 *
 * One tab, two views. The design merges appointments and service requests here
 * because from the patient's side they are the same question: what is happening
 * with my care, and what do I need to do next.
 *
 * Reschedule and cancel call exactly the endpoints the previous screen did —
 * see services/appointments.ts.
 */

type ViewKey = 'appointments' | 'requests';

export default function Activity() {
  const t = useT();

  const [view, setView] = useState<ViewKey>('appointments');
  const [bucket, setBucket] = useState<ApptBucket>('upcoming');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<OpsRequest[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Independent sources: a failing requests endpoint must not hide the
    // patient's appointments.
    const [appts, reqs] = await Promise.allSettled([
      listAppointments(),
      listRequests(),
    ]);

    if (appts.status === 'fulfilled') {
      setAppointments(appts.value);
      setState('ready');
    } else {
      setState('error');
    }
    if (reqs.status === 'fulfilled') setRequests(reqs.value);

    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<ApptBucket, number> = { upcoming: 0, past: 0, cancelled: 0 };
    appointments.forEach((a) => {
      c[bucketOf(a)] += 1;
    });
    return c;
  }, [appointments]);

  const shown = useMemo(
    () =>
      appointments
        .filter((a) => bucketOf(a) === bucket)
        .sort((a, b) =>
          bucket === 'upcoming'
            ? a.dateTime.localeCompare(b.dateTime)
            : b.dateTime.localeCompare(a.dateTime)
        ),
    [appointments, bucket]
  );

  const openCount = requests.filter(
    (r) => r.status !== 'completed' && r.status !== 'closed'
  ).length;

  /* ---------------------------------------------------------------- actions */

  const call = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${SUPPORT_NUMBER}`).catch(() => {});
  };

  const directions = (appt: Appointment) => {
    const query = encodeURIComponent(centreName(appt) || 'Oncare Cancer Centre');
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`
      ).catch(() => {})
    );
  };

  const confirmCancel = (appt: Appointment) => {
    Alert.alert(t('ui.activity.cancelTitle'), t('ui.activity.cancelBody'), [
      { text: t('ui.common.back'), style: 'cancel' },
      {
        text: t('ui.common.cancel'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(appt.appointmentId);
            toastSuccess(t('ui.activity.cancelDone'));
            await load();
          } catch {
            toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
          }
        },
      },
    ]);
  };

  const confirmPrice = async (req: OpsRequest) => {
    setConfirmingId(req.requestId);
    try {
      await confirmRequestPrice(req.requestId);
      toastSuccess(t('ui.activity.confirmPrice'));
      await load();
    } catch {
      toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
    } finally {
      setConfirmingId(null);
    }
  };

  /* ----------------------------------------------------------------- render */

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.activity.title')} back={false} />

      <Screen
        withNav
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
        {/* Appointments | Requests */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setView('appointments')}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === 'appointments' }}
            style={[styles.tab, view === 'appointments' && styles.tabOn]}
          >
            <Txt
              variant="helper"
              color={view === 'appointments' ? PALETTE.midnight : TEXT.muted}
            >
              {t('ui.activity.appointments')}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => setView('requests')}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === 'requests' }}
            style={[styles.tab, view === 'requests' && styles.tabOn]}
          >
            <Txt
              variant="helper"
              color={view === 'requests' ? PALETTE.midnight : TEXT.muted}
            >
              {t('ui.activity.requests')}
              {openCount > 0 ? ` · ${openCount}` : ''}
            </Txt>
          </Pressable>
        </View>

        {view === 'appointments' ? (
          <>
            <View style={styles.chips}>
              <Chip
                label={t('ui.activity.upcoming')}
                count={counts.upcoming}
                selected={bucket === 'upcoming'}
                onPress={() => setBucket('upcoming')}
              />
              <Chip
                label={t('ui.activity.past')}
                count={counts.past}
                selected={bucket === 'past'}
                onPress={() => setBucket('past')}
              />
              <Chip
                label={t('ui.activity.cancelled')}
                count={counts.cancelled}
                selected={bucket === 'cancelled'}
                onPress={() => setBucket('cancelled')}
              />
            </View>

            {state === 'loading' ? (
              <SkeletonList count={3} lines={2} />
            ) : state === 'error' ? (
              <ErrorState
                onRetry={() => void load()}
                icon={
                  <CalendarDays size={22} color={PALETTE.purple} strokeWidth={2} />
                }
              />
            ) : shown.length === 0 ? (
              <EmptyState
                icon={
                  <CalendarDays size={22} color={PALETTE.purple} strokeWidth={2} />
                }
                title={t('ui.activity.noAppointments')}
              />
            ) : (
              shown.map((appt) => (
                <Card key={appt.appointmentId} style={styles.apptCard}>
                  <View style={styles.apptTop}>
                    <View style={styles.flex}>
                      <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
                        {appt.visitTypeName ?? t('ui.guest.consultation')}
                      </Txt>
                      <Txt variant="helperSm" color={TEXT.muted} script="latin">
                        {appt.appointmentId}
                      </Txt>
                    </View>
                    <StatusBadge
                      label={
                        bucket === 'cancelled'
                          ? t('ui.activity.cancelled')
                          : bucket === 'past'
                          ? t('ui.status.completed')
                          : t('ui.status.confirmed')
                      }
                      status={
                        bucket === 'cancelled'
                          ? 'cancelled'
                          : bucket === 'past'
                          ? 'completed'
                          : 'confirmed'
                      }
                    />
                  </View>

                  {doctorName(appt) ? (
                    <View style={styles.doctorRow}>
                      <View style={styles.avatar}>
                        <Txt variant="helperSm" script="latin">
                          {doctorName(appt)
                            .replace(/^Dr\.?\s*/i, '')
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()}
                        </Txt>
                      </View>
                      <Txt variant="bodySm" script="latin" numberOfLines={1}>
                        {doctorName(appt)}
                      </Txt>
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <CalendarDays size={13} color={TEXT.muted} strokeWidth={2.2} />
                    <Txt variant="helperSm" color={TEXT.secondary} script="latin">
                      {formatWhen(appt.dateTime)}
                    </Txt>
                  </View>
                  {centreName(appt) ? (
                    <View style={styles.metaRow}>
                      <MapPin size={13} color={TEXT.muted} strokeWidth={2.2} />
                      <Txt
                        variant="helperSm"
                        color={TEXT.secondary}
                        script="latin"
                        numberOfLines={1}
                      >
                        {centreName(appt)}
                      </Txt>
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    {bucket === 'upcoming' ? (
                      <>
                        <Btn
                          label={t('ui.booking.directions')}
                          compact
                          block={false}
                          onPress={() => directions(appt)}
                          icon={
                            <Navigation
                              size={13}
                              color={PALETTE.white}
                              strokeWidth={2.2}
                            />
                          }
                          style={styles.action}
                        />
                        <Btn
                          label={t('ui.activity.reschedule')}
                          variant="secondary"
                          compact
                          block={false}
                          onPress={() => setRescheduling(appt)}
                          style={styles.action}
                        />
                        <Btn
                          label={t('ui.common.cancel')}
                          variant="secondary"
                          compact
                          block={false}
                          onPress={() => confirmCancel(appt)}
                          style={styles.action}
                        />
                      </>
                    ) : bucket === 'past' ? (
                      <Btn
                        label={t('ui.activity.bookAgain')}
                        variant="secondary"
                        compact
                        block={false}
                        onPress={() => directions(appt)}
                        style={styles.action}
                      />
                    ) : null}
                  </View>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            {state === 'loading' ? (
              <SkeletonList count={3} lines={3} />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={<Inbox size={22} color={PALETTE.purple} strokeWidth={2} />}
                title={t('ui.activity.noRequests')}
              />
            ) : (
              requests.map((req) => (
                <RequestCard
                  key={req.requestId}
                  request={req}
                  onCall={call}
                  confirming={confirmingId === req.requestId}
                  onConfirmPrice={() => void confirmPrice(req)}
                />
              ))
            )}
          </>
        )}
      </Screen>

      <RescheduleSheet
        appointment={rescheduling}
        onClose={() => setRescheduling(null)}
        onDone={() => {
          setRescheduling(null);
          void load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: SURFACE.disabled,
    borderRadius: 12,
    padding: 3,
    marginBottom: SPACE.md,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: SURFACE.card },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.md,
  },
  apptCard: { marginBottom: SPACE.sm, gap: SPACE.xs },
  apptTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.xxs,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  actions: {
    flexDirection: 'row',
    gap: SPACE.xs,
    flexWrap: 'wrap',
    marginTop: SPACE.xs,
  },
  action: { flexGrow: 1, minWidth: 96 },
});

const _touch = TOUCH_MIN;
