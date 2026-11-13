import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarDays,
  ChevronRight,
  LogIn,
  MapPin,
  Navigation,
  Inbox,
  User,
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
import { RecordsList } from '@/components/records/RecordsList';
import { GuestGate } from '@/components/guest/GuestGate';
import { useAuth } from '@/contexts/AuthContext';
import { RescheduleSheet } from '@/components/activity/RescheduleSheet';
import { useT } from '@/contexts/LanguageContext';
import {
  listAppointments,
  cancelAppointment,
  bucketOf,
  centreName,
  doctorName,
  doctorInitials,
  doctorPhoto,
  doctorProfileId,
  doctorSpeciality,
  formatWhen,
  type Appointment,
  type ApptBucket,
} from '@/services/appointments';
import {
  listRequests,
  confirmRequestPrice,
  type OpsRequest,
} from '@/services/requests';
import { listGuestRequests } from '@/services/guestIdentity';
import { matchCentre, openDirections } from '@/services/directions';
import { getCentres, type Centre } from '@/services/catalog';
import { SUPPORT_NUMBER } from '@/constants/contact';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  RADIUS,
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

/**
 * My Care: the patient's own appointments, requests and reports in one tab.
 *
 * Reports used to be a separate Records tab and Activity was reachable only
 * from Profile, so "where are my things" had two answers. They are now three
 * views of one screen. `?view=reports` opens straight on a tab, for a
 * notification about a new document.
 *
 * A guest gets the same three tabs. Requests lists what they sent from this
 * phone (matched on the number they used AND this device's key - see
 * services/guestIdentity.ts), and opens first, since it is the one with
 * something in it; Appointments and Reports say what logging in shows.
 */
type ViewKey = 'appointments' | 'requests' | 'reports';

export default function Activity() {
  const t = useT();
  const router = useRouter();

  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<ViewKey>(
    params.view === 'reports' || params.view === 'requests'
      ? params.view
      : isAuthenticated
      ? 'appointments'
      : 'requests'
  );
  /** Bumped by pull-to-refresh on the Reports view. */
  const [recordsKey, setRecordsKey] = useState(0);
  useEffect(() => {
    if (params.view === 'reports' || params.view === 'requests') setView(params.view);
  }, [params.view]);
  const [bucket, setBucket] = useState<ApptBucket>('upcoming');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<OpsRequest[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  // The centre master, loaded once so Directions can resolve an appointment's
  // locationId to a real address. Unauthenticated and cached server-side, and
  // a failure only degrades Directions, so it never blocks the screen.
  const [centres, setCentres] = useState<Centre[]>([]);
  useEffect(() => {
    getCentres()
      .then(setCentres)
      .catch(() => {});
  }, []);

  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  /** The appointment being cancelled, so its button can show a spinner. */
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      // A guest: only what they sent from this phone. Makes no call at all
      // until they have sent something.
      try {
        setRequests(await listGuestRequests());
      } catch {
        // Leave the last list in place; the empty state is not an error.
      }
      setAppointments([]);
      setState('ready');
      setRefreshing(false);
      return;
    }
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
  }, [isAuthenticated]);

  /**
   * Reloads on focus and resets the filter to Upcoming.
   *
   * A patient arriving here straight after booking wants to see the thing they
   * just booked. This screen stays mounted inside the tab stack, so a
   * mount-only effect left both the list and the selected bucket stale — they
   * landed on whatever tab they last used, showing pre-booking data.
   */
  useFocusEffect(
    useCallback(() => {
      setBucket('upcoming');
      // `load` knows a guest from a patient: a guest's call is the public
      // guest list, never an endpoint that would raise "please log in".
      void load();
    }, [load])
  );

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

  /**
   * Opens directions to the centre this appointment is actually at.
   *
   * It used to search on the appointment's own label, which Docpulse sets to
   * "Oncare Cancer Center" for every location — so maps opened on an arbitrary
   * Oncare, or nothing at all. The appointment's locationId is matched against
   * the centre master, which carries the real postal address and coordinates.
   */
  const directions = (appt: Appointment) => {
    const centre = matchCentre(centres, appt);
    if (centre) {
      openDirections(centre);
      return;
    }
    // No match: fall back to a plain search on whatever label we have, rather
    // than doing nothing. Still never a silent no-op.
    openDirections({ name: centreName(appt) || 'Oncare Cancer Centre' });
  };

  /**
   * Cancels an appointment, with the button showing that it is working.
   *
   * The cancel call goes to Docpulse and takes a moment. Without the pending
   * state the row looked frozen after the patient confirmed, and the button
   * stayed pressable — so a second tap sent a second cancellation for an
   * appointment that was already being cancelled.
   */
  const confirmCancel = (appt: Appointment) => {
    Alert.alert(t('ui.activity.cancelTitle'), t('ui.activity.cancelBody'), [
      { text: t('ui.common.back'), style: 'cancel' },
      {
        text: t('ui.common.cancel'),
        style: 'destructive',
        onPress: async () => {
          if (cancellingId) return;
          setCancellingId(appt.appointmentId);
          try {
            await cancelAppointment(appt.appointmentId);
            toastSuccess(t('ui.activity.cancelDone'));
            await load();
          } catch {
            toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
          } finally {
            setCancellingId(null);
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
      <ScreenHeader title={t('ui.myCare.title')} back={false} />

      <Screen
        withNav
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          if (view === 'reports' && isAuthenticated) setRecordsKey((k) => k + 1);
          else if (view === 'reports') setRefreshing(false);
          else void load();
        }}
      >
        {/* Appointments | Requests | Reports */}
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
          <Pressable
            onPress={() => setView('reports')}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === 'reports' }}
            style={[styles.tab, view === 'reports' && styles.tabOn]}
          >
            <Txt
              variant="helper"
              color={view === 'reports' ? PALETTE.midnight : TEXT.muted}
            >
              {t('ui.myCare.reports')}
            </Txt>
          </Pressable>
        </View>

        {view === 'appointments' && !isAuthenticated ? (
          <GuestGate title="ui.myCare.guestApptTitle" body="ui.myCare.guestApptBody" showItems={false} />
        ) : view === 'appointments' ? (
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
              shown.map((appt) => {
                // Resolved once per card rather than inside each branch of the
                // JSX: both the link and its own press handler need them, and
                // matchCentre scans the centre master.
                const centre = matchCentre(centres, appt);
                const profileId = doctorProfileId(appt);
                const photo = doctorPhoto(appt);
                const speciality = doctorSpeciality(appt);

                return (
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
                          {photo ? (
                            <Image
                              source={{ uri: photo }}
                              style={styles.photo}
                              resizeMode="cover"
                              accessibilityLabel={doctorName(appt)}
                            />
                          ) : (
                            <Txt variant="helperSm" script="latin">
                              {doctorInitials(appt)}
                            </Txt>
                          )}
                        </View>
                        <View style={styles.flex}>
                          <Txt variant="bodySm" script="latin" numberOfLines={1}>
                            {doctorName(appt)}
                          </Txt>
                          {speciality ? (
                            <Txt
                              variant="helperSm"
                              color={PALETTE.purple}
                              script="latin"
                              numberOfLines={1}
                            >
                              {speciality}
                            </Txt>
                          ) : null}
                        </View>
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

                    {/*
                      The two things a patient looks up about a booking they
                      already have: who the doctor is, and where the centre
                      actually is. Each appears only when there is a record
                      behind it — a Docpulse-only practitioner has no CMS
                      profile, and an unmatched locationId has no centre page.
                      Shown on past and cancelled cards too; both are
                      read-only, and "who did I see in March" is a real question.
                    */}
                    {profileId || centre ? (
                      <View style={styles.links}>
                        {profileId ? (
                          <Pressable
                            onPress={() => router.push(`/doctor/${profileId}`)}
                            accessibilityRole="button"
                            hitSlop={8}
                            style={styles.linkBtn}
                          >
                            <User
                              size={12}
                              color={PALETTE.deepBlue}
                              strokeWidth={2.4}
                            />
                            <Txt variant="helperSm" color={PALETTE.deepBlue}>
                              {t('ui.booking.viewProfile')}
                            </Txt>
                          </Pressable>
                        ) : null}
                        {centre ? (
                          <Pressable
                            onPress={() => router.push(`/centre/${centre.id}`)}
                            accessibilityRole="button"
                            hitSlop={8}
                            style={styles.linkBtn}
                          >
                            <MapPin
                              size={12}
                              color={PALETTE.deepBlue}
                              strokeWidth={2.4}
                            />
                            <Txt variant="helperSm" color={PALETTE.deepBlue}>
                              {t('ui.booking.centreDetails')}
                            </Txt>
                          </Pressable>
                        ) : null}
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
                            loading={cancellingId === appt.appointmentId}
                            // Every row is disabled while one is cancelling: the
                            // list reloads afterwards, so letting a second row be
                            // tapped mid-flight would act on a stale list.
                            disabled={
                              cancellingId !== null &&
                              cancellingId !== appt.appointmentId
                            }
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
                );
              })
            )}
          </>
        ) : view === 'requests' ? (
          <>
            {!isAuthenticated ? (
              <Txt variant="helperSm" color={TEXT.secondary} style={styles.guestIntro}>
                {t('ui.myCare.guestRequestsBody')}
              </Txt>
            ) : null}
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
                  // Accepting a price is an authenticated action; a guest
                  // confirms on the call instead.
                  onConfirmPrice={isAuthenticated ? () => void confirmPrice(req) : undefined}
                />
              ))
            )}

            {/* The way from here to the full picture: reports, appointments
                and real slots are behind login. */}
            {!isAuthenticated ? (
              <Pressable
                onPress={() => router.push('/login')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.guestLoginWrap, pressed && styles.pressed]}
              >
                <Card tone="info" style={styles.guestLogin}>
                  <View style={styles.guestLoginIcon}>
                    <LogIn size={16} color={PALETTE.midnight} strokeWidth={2.2} />
                  </View>
                  <View style={styles.flex}>
                    <Txt variant="bodyMedium">{t('ui.myCare.guestLoginTitle')}</Txt>
                    <Txt variant="helperSm" color={TEXT.secondary}>
                      {t('ui.myCare.guestLoginBody')}
                    </Txt>
                  </View>
                  <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
                </Card>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {view === 'reports' && !isAuthenticated ? (
          <GuestGate title="ui.myCare.guestReportsTitle" body="ui.myCare.guestReportsBody" showItems={false} />
        ) : view === 'reports' ? (
          <RecordsList
            reloadKey={recordsKey}
            onSettled={() => setRefreshing(false)}
          />
        ) : null}
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
  pressed: { opacity: 0.9 },
  guestIntro: { marginBottom: SPACE.sm },
  guestLoginWrap: { marginTop: SPACE.md },
  guestLogin: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  guestLoginIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    // 28px circle before, which was enough for two letters and far too small
    // for a face. Same rounded square the booking screens use for a portrait.
    width: 44,
    height: 44,
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.md,
    marginTop: SPACE.xxs,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
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
