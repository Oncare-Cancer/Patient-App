import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search,
  UserRound,
  Pill,
  FlaskConical,
  BedDouble,
} from 'lucide-react-native';
import {
  Btn,
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
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * A4 — Home (logged in).
 *
 * Replaces a screen that showed only name, age, gender and personal details,
 * with no route to booking, reports or any service. The order here is the
 * design's and it is a priority order: book, then what is already happening,
 * then everything else.
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
  const { patient } = useAuth();

  const [appointment, setAppointment] = useState<NextAppointment | null>(null);
  const [openRequest, setOpenRequest] = useState<OpsRequest | null>(null);
  // The centre master, so the next-appointment card can offer Directions that
  // open the right building. Public and cached server-side.
  const [centres, setCentres] = useState<Centre[]>([]);
  /**
   * Unread notifications, for the dot on the bell.
   *
   * The header has always supported this and home never passed it, so the dot
   * could not appear however many notifications were waiting. Re-read on focus
   * because the patient reads them on another screen and comes back.
   */
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  // Loaded once for the Directions button on the appointment card. The
  // endpoint is public and cached server-side, and a failure only costs that
  // one button, so it never blocks the screen.
  useEffect(() => {
    getCentres()
      .then(setCentres)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      void unreadNotificationCount().then(setUnread);
    }, [])
  );
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
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
  }, []);

  /**
   * Reloads every time Home comes back into focus, not just on mount.
   *
   * Booking happens on another screen in the same tab stack, so this component
   * is never unmounted: with a mount-only effect, a patient who booked an
   * appointment came back to Home and still saw "No upcoming appointments".
   */
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
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
        key: 'medicines',
        label: t('ui.home.orderMedicines'),
        Icon: Pill,
        onPress: () => router.push('/services/medicines'),
      },
      {
        key: 'lab',
        label: t('ui.home.labTestAtHome'),
        Icon: FlaskConical,
        onPress: () => router.push('/services/lab-tests'),
      },
      {
        key: 'admission',
        label: t('ui.home.admissionDaycare'),
        Icon: BedDouble,
        onPress: () => router.push('/services/admission'),
      },
      // Home Care and Insurance Help are intentionally absent: four tiles in a
      // 2x2 grid give each one room to breathe, and these two were the least
      // used entry points. Their screens still exist and remain reachable.
    ],
    [t, router]
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
        />
      }
    >
      {/* Booking card, lifted to overlap the header's rounded edge. */}
      <Card style={styles.bookCard}>
        <View style={styles.bookTop}>
          <View style={styles.flex}>
            <Txt variant="section">{t('ui.home.bookConsultation')}</Txt>
            <Txt variant="helperSm" color={TEXT.muted}>
              {t('ui.home.bookSubtitle', { count: 9 })}
            </Txt>
          </View>
          <Btn
            label={t('ui.nav.book')}
            compact
            block={false}
            onPress={() => router.push('/(tabs)/book')}
          />
        </View>

        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={t('ui.home.searchPlaceholder')}
          style={styles.searchBox}
        >
          <Search size={15} color={TEXT.muted} strokeWidth={2} />
          <Txt variant="bodySm" color={TEXT.muted} numberOfLines={1} style={styles.flex}>
            {t('ui.home.searchPlaceholder')}
          </Txt>
        </Pressable>

        {/* The "Nearest centre" row is gone. There is no location permission
            and no preferred-centre setting, so it could only ever render an
            em dash next to a "Change" link that went to the booking flow. */}
      </Card>

      {/* The heading needs the same breathing room above it as "Care
          services": SectionRow only carries a bottom margin, so without this
          wrapper the title sat flush against the booking card. */}
      <View style={styles.nextStepHeading}>
        <SectionRow
          action={
            <Pressable
              onPress={() => router.push('/(tabs)/appointments')}
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
          onPress={() => router.push('/(tabs)/appointments')}
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
          // team calls them, and the status because it is the reason this row
          // is on the home screen at all.
          detail={[openRequest.requestId, t(`ui.status.${openRequest.status}`)]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => router.push('/(tabs)/appointments')}
        />
      ) : null}

      <Txt variant="section" style={styles.servicesTitle}>
        {t('ui.home.careServices')}
      </Txt>
      <ServiceGrid tiles={services} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    // The booking card is pulled up over the header, so the usual top gutter
    // would double the gap.
    paddingTop: 0,
  },
  bookCard: {
    marginTop: -SPACE.xxl,
    gap: SPACE.sm,
  },
  bookTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TOUCH_MIN,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.screen,
    paddingHorizontal: SPACE.sm,
  },
  emptyNext: {
    paddingVertical: SPACE.md,
  },
  nextStepHeading: {
    marginTop: SPACE.lg,
  },
  servicesTitle: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
});
