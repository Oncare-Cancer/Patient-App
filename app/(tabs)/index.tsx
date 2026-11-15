import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  UserRound,
  Pill,
  FlaskConical,
  BedDouble,
  Home as HomeIcon,
  MapPin,
  PhoneCall,
  CalendarPlus,
  ChevronRight,
  LogIn,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Card,
  Screen,
  SectionRow,
  SkeletonCard,
  Txt,
} from '@/components/ui';
import { HomeHeader } from '@/components/home/HomeHeader';
import {
  NextAppointmentCard,
  OpenRequestRow,
} from '@/components/home/NextStep';
import { ServiceGrid, type ServiceTile } from '@/components/home/ServiceGrid';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { appointmentApi } from '@/services/api';
import { centreName, doctorName } from '@/services/appointments';
import { listRequests, type OpsRequest } from '@/services/requests';
import { ADMISSION_KINDS } from '@/constants/clinical';
import type { StringKey, TParams } from '@/constants/i18n';
import { matchCentre, openDirections } from '@/services/directions';
import { unreadNotificationCount } from '@/services/appNotifications';
import { getCentres, type Centre } from '@/services/catalog';
import { listVideos, type Video } from '@/services/content';
import { ShortCard, VideoCard } from '@/components/discover/Cards';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * A4 — Home, for everyone (round 7).
 *
 * The app used to open on a login screen, and a guest had a separate home of
 * their own. A patient's first question is what Oncare can do for them, so
 * the app now opens here, signed in or not, and asks for a phone number only
 * when the patient picks a service.
 *
 * Order, top to bottom:
 *   Book a consultation - the one big tile, lifted over the header edge
 *   Your next step      - signed in: the next appointment and open request
 *   Login strip         - guest: "Already an Oncare patient? Log in..."
 *   Care services       - six tiles, the same for both
 *   Call me             - for someone who does not know where to start
 *   Videos, Shorts      - a few from the library, "See all" opens Discover
 *
 * The old booking card with its search box is gone: finding a doctor lives in
 * Book now, and three search boxes for one list was the thing to fix.
 */

type NextAppointment = {
  month: string;
  day: string;
  title: string;
  subtitle: string;
  /**
   * The Docpulse location, kept so Directions can resolve this booking to a
   * real postal address. The label alone cannot do it: Docpulse names every
   * location "Oncare Cancer Center", so a maps search on it opens an arbitrary
   * centre.
   */
  locationId?: string;
  locationName?: string;
};

/** Service request type -> the title the patient knows it by. */
const REQUEST_TITLE: Record<string, StringKey> = {
  medicine: 'ui.home.orderMedicines',
  lab: 'ui.home.labTestAtHome',
  secondOpinion: 'ui.home.secondOpinion',
  admission: 'ui.home.admissionDaycare',
  homeCare: 'ui.home.homeCare',
  callBack: 'ui.guest.callBackTitle',
};

/**
 * A readable title for an open request.
 *
 * This row used to print `subType` straight out of the record, so an admission
 * showed the literal string "dayCare" — an internal value a patient has never
 * seen. The type gives the name they know, and where the sub-type is one of
 * the admission kinds it is used instead, because "Day care / chemotherapy" is
 * more use to them than "Admission & Day-care".
 */
function requestTitle(
  t: (key: StringKey, params?: TParams) => string,
  req: OpsRequest
): string {
  const kind = ADMISSION_KINDS.find((k) => k.value === req.subType);
  if (kind) return t(kind.labelKey as StringKey);

  const key = REQUEST_TITLE[req.type];
  return key ? t(key) : req.requestId;
}

/** Pulls the earliest future appointment out of the Docpulse payload. */
function earliestUpcoming(raw: any[]): NextAppointment | null {
  const now = Date.now();
  const future = raw
    .map((a) => {
      const iso = a.dateTime ?? a.appointmentDate ?? a.date;
      const when = iso ? new Date(iso) : null;
      return when && !Number.isNaN(when.getTime()) ? { a, when } : null;
    })
    .filter((x): x is { a: any; when: Date } => x !== null)
    .filter(({ a, when }) => {
      const status = String(a.status ?? '').toLowerCase();
      return when.getTime() > now && status !== 'cancelled';
    })
    .sort((x, y) => x.when.getTime() - y.when.getTime());

  const first = future[0];
  if (!first) return null;

  const { a, when } = first;
  const time = when.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  // Field names come from the shared mapper rather than being guessed again
  // here: the payload uses `visitTypeName`, so the old `a.visitType ?? a.type`
  // never matched and every card read "Consultation".
  const visitType = a.visitTypeName ?? 'Consultation';
  const doctor = doctorName(a);
  const centre = centreName(a);

  return {
    month: when.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    day: String(when.getDate()).padStart(2, '0'),
    title: `${visitType} · ${time}`,
    subtitle: [doctor, centre].filter(Boolean).join(' · '),
    // Kept so Directions can resolve this booking to a real address. The
    // label alone cannot: Docpulse names every location "Oncare Cancer
    // Center".
    locationId: a.locationId ? String(a.locationId) : undefined,
    locationName: centre || undefined,
  };
}

export default function HomeScreen() {
  const t = useT();
  const router = useRouter();
  const { patient, isAuthenticated } = useAuth();
  const signedIn = isAuthenticated && !!patient;

  const [appointment, setAppointment] = useState<NextAppointment | null>(null);
  const [openRequest, setOpenRequest] = useState<OpsRequest | null>(null);
  // The centre master, so the next-appointment card can offer Directions that
  // open the right building. Public and cached server-side.
  const [centres, setCentres] = useState<Centre[]>([]);
  /** Unread notifications, for the dot on the bell. Re-read on focus. */
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getCentres()
      .then(setCentres)
      .catch(() => {});
  }, []);

  /**
   * A few videos and shorts, below the services. The effect runs after the
   * first paint, so Home's own content is never held up by it; the library is
   * cached for the session, so Discover opens on the same response without a
   * refetch.
   */
  const [videos, setVideos] = useState<Video[]>([]);
  useEffect(() => {
    let alive = true;
    listVideos()
      .then((res) => {
        if (alive) setVideos(res.videos);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const fullVideos = useMemo(() => videos.filter((v) => !v.short).slice(0, 6), [videos]);
  const shortVideos = useMemo(() => videos.filter((v) => v.short).slice(0, 8), [videos]);

  const load = useCallback(async () => {
    // A guest has nothing of their own to load, and asking would raise the
    // "please log in" alert on the screen meant to welcome them.
    if (!signedIn) {
      setAppointment(null);
      setOpenRequest(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    // Appointments and requests are independent: a failure in one must not
    // blank the other, so they settle separately rather than in one try block.
    const [appts, reqs] = await Promise.allSettled([
      appointmentApi.getPatientAppointments(),
      listRequests(),
    ]);

    if (appts.status === 'fulfilled' && appts.value) {
      setAppointment(earliestUpcoming(appts.value));
    }

    if (reqs.status === 'fulfilled') {
      const open = reqs.value
        .filter((r) => r.status !== 'completed' && r.status !== 'closed')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setOpenRequest(open ?? null);
    }

    setLoading(false);
    setRefreshing(false);
  }, [signedIn]);

  /**
   * Reloads every time Home comes back into focus, not just on mount.
   *
   * Booking happens on another screen in the same tab stack, so this component
   * is never unmounted: with a mount-only effect, a patient who booked an
   * appointment came back to Home and still saw "No upcoming appointments".
   * It also reruns when the patient logs in from the header, so Home turns
   * personal without a pull-to-refresh.
   */
  useFocusEffect(
    useCallback(() => {
      void load();
      if (signedIn) void unreadNotificationCount().then(setUnread);
    }, [load, signedIn])
  );

  const services: ServiceTile[] = useMemo(
    () => [
      {
        key: 'second-opinion',
        label: t('ui.home.secondOpinion'),
        Icon: UserRound,
        onPress: () => router.push('/services/second-opinion'),
      },
      {
        key: 'home-care',
        label: t('ui.home.homeCare'),
        Icon: HomeIcon,
        onPress: () => router.push('/services/home-care'),
      },
      {
        key: 'lab',
        label: t('ui.home.labTestAtHome'),
        Icon: FlaskConical,
        onPress: () => router.push('/services/lab-tests'),
      },
      {
        key: 'medicines',
        label: t('ui.home.orderMedicines'),
        Icon: Pill,
        onPress: () => router.push('/services/medicines'),
      },
      {
        key: 'admission',
        label: t('ui.home.admissionDaycare'),
        Icon: BedDouble,
        onPress: () => router.push('/services/admission'),
      },
      {
        // Centres live in Discover now; this tile is the shortcut to them.
        key: 'centres',
        label: t('ui.home.ourCentres'),
        Icon: MapPin,
        onPress: () =>
          router.push({ pathname: '/discover/directory', params: { tab: 'centres' } } as never),
      },
    ],
    [t, router]
  );

  const seeAll = (onPress: () => void) => (
    // Padding, not a hitSlop, and none below: a downward hitSlop reached over
    // the card rail under the heading, which is drawn later and so won the
    // tap - "See all" opened the first video instead.
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, left: 12, right: 12, bottom: 0 }}
      accessibilityRole="button"
      style={{ paddingVertical: 6, paddingLeft: 12 }}
    >
      <Txt variant="helper" color={PALETTE.purple}>
        {t('ui.discover.seeAll')}
      </Txt>
    </Pressable>
  );

  const name = patient?.patient_name ?? '';
  const hospitalId = patient?.patient_id;

  /*
   * The centre record behind the next appointment, matched on its Docpulse
   * locationId. Only when it matches does the card offer Directions — a button
   * that opens the wrong building is worse than no button.
   */
  const nextCentre = appointment ? matchCentre(centres, appointment) : null;

  return (
    <Screen
      withNav
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      contentStyle={styles.content}
      bleed={
        <HomeHeader
          name={name}
          hospitalId={hospitalId}
          unreadCount={unread}
          onNotifications={() => router.push('/notifications')}
          guest={!signedIn}
          onLogin={() => router.push('/login')}
        />
      }
    >
      {/* The one big tile: booking is what most patients open the app for. */}
      <Pressable
        onPress={() => router.replace('/(tabs)/book')}
        accessibilityRole="button"
        accessibilityLabel={t('ui.home.bookTileTitle')}
        style={({ pressed }) => [styles.bookWrap, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[...GRADIENT.selected]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bookTile}
        >
          <View style={styles.bookIcon}>
            <CalendarPlus size={22} color={PALETTE.white} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Txt variant="section" color={TEXT.onDark}>
              {t('ui.home.bookTileTitle')}
            </Txt>
            <Txt variant="helperSm" color={TEXT.onDark} style={styles.bookBody}>
              {t('ui.home.bookTileBody')}
            </Txt>
          </View>
          <View style={styles.bookArrow}>
            <ChevronRight size={18} color={PALETTE.midnight} strokeWidth={2.6} />
          </View>
        </LinearGradient>
      </Pressable>

      {signedIn ? (
        <>
          <View style={styles.sectionGap}>
            <SectionRow
              action={
                <Pressable
                  onPress={() => router.replace('/(tabs)/appointments')}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Txt variant="helper" color={PALETTE.purple}>
                    {t('ui.home.viewAll')}
                  </Txt>
                </Pressable>
              }
            >
              <Txt variant="section">{t('ui.home.yourNextStep')}</Txt>
            </SectionRow>
          </View>

          {loading ? (
            <SkeletonCard lines={1} />
          ) : appointment ? (
            <NextAppointmentCard
              month={appointment.month}
              day={appointment.day}
              title={appointment.title}
              subtitle={appointment.subtitle}
              onPress={() => router.replace('/(tabs)/appointments')}
              onDirections={
                nextCentre ? () => openDirections(nextCentre) : undefined
              }
            />
          ) : (
            <Card tone="info" style={styles.emptyNext}>
              <Txt variant="bodySm" color={TEXT.secondary}>
                {t('ui.home.noUpcoming')}
              </Txt>
            </Card>
          )}

          {openRequest ? (
            <OpenRequestRow
              label={requestTitle(t, openRequest)}
              // The id is here because it is what a patient reads out when the
              // team calls them, and the status because it is the reason this
              // row is on the home screen at all.
              detail={[openRequest.requestId, t(`ui.status.${openRequest.status}`)]
                .filter(Boolean)
                .join(' · ')}
              onPress={() =>
                router.replace({
                  pathname: '/(tabs)/appointments',
                  params: { view: 'requests' },
                } as never)
              }
            />
          ) : null}
        </>
      ) : (
        /*
          The second way in for an existing patient (the header button is the
          first): a patient who already has reports with us should not have
          to wonder whether this app is for them.
        */
        <Pressable
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.sectionGap, pressed && styles.pressed]}
        >
          <Card tone="info" style={styles.loginStrip}>
            <View style={styles.stripIcon}>
              <LogIn size={16} color={PALETTE.midnight} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Txt variant="bodyMedium">{t('ui.home.loginStripTitle')}</Txt>
              <Txt variant="helperSm" color={TEXT.secondary}>
                {t('ui.home.loginStripBody')}
              </Txt>
            </View>
            <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
          </Card>
        </Pressable>
      )}

      <Txt variant="section" style={styles.servicesTitle}>
        {t('ui.home.careServices')}
      </Txt>
      <ServiceGrid tiles={services} columns={3} />

      {/* For the patient who does not know which service they need. */}
      <Pressable
        onPress={() => router.push('/guest/callback')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.sectionGap, pressed && styles.pressed]}
      >
        <Card tone="plain" style={styles.callCard}>
          <View style={styles.stripIcon}>
            <PhoneCall size={16} color={PALETTE.midnight} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Txt variant="bodyMedium">{t('ui.guest.notSureTitle')}</Txt>
            <Txt variant="helperSm" color={TEXT.muted}>
              {t('ui.guest.notSureBody')}
            </Txt>
          </View>
          <View style={styles.callMe}>
            <Txt variant="helperSm" color={TEXT.onDark} center numberOfLines={1}>
              {t('ui.guest.callMe')}
            </Txt>
          </View>
        </Card>
      </Pressable>

      {/* Hidden until loaded, and if the library fails: no skeleton for an
          optional section below the fold. */}
      {fullVideos.length ? (
        <>
          <View style={styles.sectionGap}>
            <SectionRow action={seeAll(() => router.push({ pathname: '/discover/videos' } as never))}>
              <Txt variant="section">{t('ui.discover.videos')}</Txt>
            </SectionRow>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            style={styles.bleed}
          >
            {fullVideos.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                width={220}
                onPress={() =>
                  router.push({ pathname: '/discover/video/[slug]', params: { slug: v.slug } } as never)
                }
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {shortVideos.length ? (
        <>
          <View style={styles.sectionGap}>
            <SectionRow action={seeAll(() => router.push({ pathname: '/discover/videos', params: { kind: 'short' } } as never))}>
              <Txt variant="section">{t('ui.discover.shorts')}</Txt>
            </SectionRow>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            style={styles.bleed}
          >
            {shortVideos.map((v) => (
              <ShortCard
                key={v.id}
                video={v}
                width={120}
                onPress={() =>
                  router.push({ pathname: '/discover/shorts', params: { start: v.slug } } as never)
                }
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    // The Book tile is pulled up over the header, so the usual top gutter
    // would double the gap.
    paddingTop: 0,
  },
  pressed: {
    opacity: 0.9,
  },
  bookWrap: {
    marginTop: -SPACE.xxl,
    borderRadius: RADIUS.cardLg,
    ...SHADOW.card,
  },
  bookTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.cardLg,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.lg,
    minHeight: 96,
  },
  bookIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBody: {
    marginTop: 2,
    opacity: 0.9,
  },
  bookArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionGap: {
    marginTop: SPACE.lg,
  },
  emptyNext: {
    paddingVertical: SPACE.md,
  },
  loginStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  stripIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesTitle: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  // Rails run edge to edge; the first card still lines up with the gutter.
  bleed: {
    marginHorizontal: -SPACE.gutter,
  },
  rail: {
    gap: SPACE.sm,
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPACE.xs,
  },
  callMe: {
    backgroundColor: PALETTE.midnight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
  },
});
