import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  MapPin,
  UserRound,
  Home as HomeIcon,
  Pill,
  FlaskConical,
  BedDouble,
  ShieldCheck,
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
import { listRequests, type OpsRequest } from '@/services/requests';
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
};

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
  const visitType = a.visitType ?? a.type ?? 'Consultation';
  const doctor = a.practitionerName ?? a.doctorName ?? a.doctor ?? '';
  const centre = a.locationAlias ?? a.locationName ?? a.centre ?? '';

  return {
    month: when.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    day: String(when.getDate()).padStart(2, '0'),
    title: `${visitType} · ${time}`,
    subtitle: [doctor, centre].filter(Boolean).join(' · '),
  };
}

export default function HomeScreen() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();

  const [appointment, setAppointment] = useState<NextAppointment | null>(null);
  const [openRequest, setOpenRequest] = useState<OpsRequest | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    void load();
  }, [load]);

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
      {
        key: 'insurance',
        label: t('ui.home.insuranceHelp'),
        Icon: ShieldCheck,
        onPress: () => router.push('/services/insurance'),
      },
    ],
    [t, router]
  );

  const name = patient?.patient_name ?? '';
  const hospitalId = patient?.patient_id;

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
          onPress={() => router.push('/(tabs)/book')}
          accessibilityRole="search"
          accessibilityLabel={t('ui.home.searchPlaceholder')}
          style={styles.searchBox}
        >
          <Search size={15} color={TEXT.muted} strokeWidth={2} />
          <Txt variant="bodySm" color={TEXT.muted} numberOfLines={1} style={styles.flex}>
            {t('ui.home.searchPlaceholder')}
          </Txt>
        </Pressable>

        <View style={styles.nearestRow}>
          <MapPin size={12} color={PALETTE.purple} strokeWidth={2.4} />
          <Txt variant="helperSm" color={TEXT.secondary} numberOfLines={1} style={styles.flex}>
            {t('ui.home.nearest')}:{' '}
            <Txt variant="helper" script="latin">
              {/* Preferred centre until location permission is wired, per the
                  Data note on section 05. */}
              —
            </Txt>
          </Txt>
          <Pressable onPress={() => router.push('/(tabs)/book')} hitSlop={8}>
            <Txt variant="helperSm" color={PALETTE.deepBlue} style={styles.link}>
              {t('ui.common.change')}
            </Txt>
          </Pressable>
        </View>
      </Card>

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

      {loading ? (
        <SkeletonCard lines={1} />
      ) : appointment ? (
        <NextAppointmentCard
          {...appointment}
          onPress={() => router.push('/(tabs)/appointments')}
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
          label={openRequest.subType ?? openRequest.requestId}
          detail={t(`ui.status.${openRequest.status}`)}
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
  nearestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
  },
  link: {
    textDecorationLine: 'underline',
  },
  emptyNext: {
    paddingVertical: SPACE.md,
  },
  servicesTitle: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
});
