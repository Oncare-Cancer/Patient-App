import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, MapPin, UserRound, Users } from 'lucide-react-native';
import {
  Btn,
  Card,
  Chip,
  Field,
  PhoneField,
  Screen,
  ScreenHeader,
  StepProgress,
  Txt,
} from '@/components/ui';
import { CentreStep } from '@/components/booking/CentreStep';
import { DoctorStep } from '@/components/booking/DoctorStep';
import { useT } from '@/contexts/LanguageContext';
import { getCentres, type Centre } from '@/services/catalog';
import { getCentreDetail, type Doctor } from '@/services/doctors';
import type { Location, Practitioner } from '@/services/booking';
import {
  centresByDistance,
  getApproxLocation,
  nearestCentre,
  rememberedCentreId,
} from '@/services/location';
import { createGuestRequest, requestErrorMessage } from '@/services/requests';
import { DEFAULT_COUNTRY_CODE, isValidPhone } from '@/utils/phone';
import { toastError } from '@/utils/toast';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Book, for a guest: a consultation REQUEST, not a Docpulse booking.
 *
 * WHY A SEPARATE FLOW
 * Every Docpulse endpoint the real booking uses - locations, practitioners,
 * visit types, slots, create - requires a patient session (verified: 401
 * without a token). So a guest cannot see live slots, and putting them
 * through the patient flow would end on a login alert halfway in.
 *
 * Instead this uses only the public CMS endpoints the centre pages already
 * read: the centre list (with coordinates) and each centre's doctors. The
 * guest picks a centre, a doctor (or "any doctor"), a preferred day and time,
 * gives a name and number, and the request lands on the team's dashboard as
 * a `consultation`. The team calls to fix the time.
 *
 * A guest who does have an account is offered login at the details step;
 * the chosen centre and doctor go with them into the real slot booking.
 */

type Step = 'centre' | 'doctor' | 'details' | 'done';
type Slot = 'morning' | 'afternoon' | 'evening';

/** Same loose name match the patient flow uses (CMS vs Docpulse spellings). */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\bdr\.?\b/g, '').replace(/[^a-z]/g, '');
  return norm(a) === norm(b) && norm(a).length > 0;
}

/** A CMS centre in the shape CentreStep renders. */
function asLocation(c: Centre): Location {
  return {
    id: c.id,
    name: c.name,
    label: c.name,
    area: undefined,
    // cityOf() reads name + address to tell Bengaluru from Delhi NCR.
    address: c.address,
  };
}

/** A CMS doctor in the shape DoctorStep renders. */
function asPractitioner(d: Doctor): Practitioner {
  return {
    id: d.id,
    name: d.name,
    speciality: d.speciality,
    experience: d.experience,
    img: d.img ?? null,
    hasProfile: d.hasProfile && !!d.profileId,
    profileId: d.profileId,
  };
}

/** The next seven days, as ISO dates. */
function nextDays(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
}

export function GuestBooking() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ centreId?: string; doctorName?: string }>();

  const [step, setStep] = useState<Step>('centre');

  const [centres, setCentres] = useState<Centre[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [centre, setCentre] = useState<Centre | null>(null);
  /** How the centre was chosen, for the line above the doctors. */
  const [why, setWhy] = useState<{ kind: 'nearest' | 'last' | 'picked'; km?: number }>({
    kind: 'picked',
  });
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<string | undefined>();
  const [locating, setLocating] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  /** null = not chosen yet; 'any' = no preference. */
  const [doctor, setDoctor] = useState<Doctor | 'any' | null>(null);

  const days = useMemo(nextDays, []);
  const [day, setDay] = useState(days[1]);
  const [slot, setSlot] = useState<Slot>('morning');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestId, setRequestId] = useState('');

  /* ---------------------------------------------------------------- loads */

  const pickCentre = useCallback(
    async (c: Centre, how: { kind: 'nearest' | 'last' | 'picked'; km?: number }) => {
      setCentre(c);
      setWhy(how);
      setDoctor(null);
      setStep('doctor');
      setLoadingDoctors(true);
      try {
        const detail = await getCentreDetail(c.id);
        const list = detail?.doctors ?? [];
        setDoctors(list);
        // Arriving from a doctor's page: that doctor is the answer already.
        if (params.doctorName) {
          const match = list.find((d) => sameName(d.name, params.doctorName!));
          if (match) {
            setDoctor(match);
            setStep('details');
          }
        }
      } catch {
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    },
    [params.doctorName]
  );

  /** Works out distances and, if one is close enough, opens on that centre. */
  const locate = useCallback(
    async (list: Centre[], force: boolean) => {
      setLocating(true);
      const here = await getApproxLocation({ force });
      setLocating(false);
      if (!here) {
        setNotice(t('ui.booking.locationOff'));
        return false;
      }
      const km: Record<string, number> = {};
      centresByDistance(list, here).forEach(({ centre: c, km: d }) => {
        if (d !== null) km[c.id] = d;
      });
      setDistances(km);
      const near = nearestCentre(list, here);
      if (!near) {
        setNotice(t('ui.booking.tooFar'));
        return false;
      }
      setNotice(undefined);
      void pickCentre(near.centre, { kind: 'nearest', km: near.km });
      return true;
    },
    [pickCentre, t]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      let list: Centre[] = [];
      try {
        list = await getCentres();
      } catch {
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
      }
      if (!alive) return;
      setCentres(list);
      setLoadingCentres(false);

      // 1. A centre page sent them here: that centre, no questions.
      const fromPage = params.centreId
        ? list.find((c) => c.locationId === params.centreId || c.id === params.centreId)
        : null;
      if (fromPage) return void pickCentre(fromPage, { kind: 'picked' });

      // 2. The centre they used last time.
      const last = await rememberedCentreId();
      const remembered = last ? list.find((c) => c.locationId === last) : null;
      if (remembered) return void pickCentre(remembered, { kind: 'last' });

      // 3. The nearest centre within 50 km, else choose by hand.
      await locate(list, false);
    })();
    return () => {
      alive = false;
    };
    // Runs once on mount; the params are read at arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------------- submit */

  const doctorName = doctor && doctor !== 'any' ? doctor.name : '';
  const nameOk = name.trim().length >= 2;
  const phoneOk = isValidPhone(phone, countryCode);

  const send = async () => {
    setTouched(true);
    if (!centre || !nameOk || !phoneOk || sending) return;
    setSending(true);
    try {
      const res = await createGuestRequest({
        type: 'consultation',
        name: name.trim(),
        phone,
        countryCode,
        centre: centre.name,
        preferredDate: day,
        preferredSlot: slot,
        meta: {
          doctorName: doctorName || undefined,
          doctorProfileId: doctor && doctor !== 'any' ? doctor.profileId : undefined,
          // A Docpulse practitioner id when the centre's list came from
          // Docpulse - lets the team book the exact doctor without searching.
          practitionerId: doctor && doctor !== 'any' ? doctor.id : undefined,
          locationId: centre.locationId,
          centreId: centre.id,
        },
        origin: { type: 'booking' },
      });
      setRequestId(res.requestId);
      setStep('done');
    } catch (err) {
      toastError(
        t('ui.common.somethingWrong'),
        requestErrorMessage(err) ?? t('ui.common.retry')
      );
    } finally {
      setSending(false);
    }
  };

  /** Into the real booking with the same centre and doctor, after login. */
  const loginForSlots = () => {
    router.setParams({
      centreId: centre?.locationId ?? '',
      doctorName: doctorName,
    } as never);
    router.push('/login');
  };

  /* --------------------------------------------------------------- render */

  const steps = [
    t('ui.booking.stepCentre'),
    t('ui.booking.stepDoctor'),
    t('ui.booking.stepDetails'),
  ];
  const stepIndex = step === 'centre' ? 0 : step === 'doctor' ? 1 : 2;

  const back = () => {
    if (step === 'details') setStep('doctor');
    else if (step === 'doctor') setStep('centre');
    else router.replace('/(tabs)');
  };

  const dayLabel = (iso: string, i: number) => {
    if (i === 0) return t('ui.homeCare.today');
    if (i === 1) return t('ui.homeCare.tomorrow');
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const SLOTS: { key: Slot; label: string; hint: string }[] = [
    { key: 'morning', label: t('ui.booking.morning'), hint: t('ui.booking.morningHint') },
    { key: 'afternoon', label: t('ui.booking.afternoon'), hint: t('ui.booking.afternoonHint') },
    { key: 'evening', label: t('ui.booking.evening'), hint: t('ui.booking.eveningHint') },
  ];

  if (step === 'done') {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('ui.booking.requestSentTitle')} back={false} />
        <Screen withNav>
          <Card style={styles.doneCard}>
            <View style={styles.doneBadge}>
              <Check size={26} color="#16A34A" strokeWidth={3} />
            </View>
            <Txt variant="titleLg" center>
              {t('ui.booking.requestSentTitle')}
            </Txt>
            <Txt variant="body" color={TEXT.secondary} center>
              {t('ui.booking.requestSentBody', {
                phone: countryCode === '91' ? `+91 ${phone}` : `+${countryCode} ${phone}`,
              })}
            </Txt>
            <View style={styles.summary}>
              {[
                [t('ui.booking.requestId'), requestId],
                [t('ui.booking.centre'), centre?.name ?? ''],
                [t('ui.booking.doctor'), doctorName],
                [t('ui.booking.preferredDay'), dayLabel(day, days.indexOf(day))],
                [t('ui.booking.preferredTime'), SLOTS.find((s) => s.key === slot)?.label ?? ''],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <View key={label} style={styles.summaryRow}>
                    <Txt variant="helperSm" color={TEXT.muted}>
                      {label}
                    </Txt>
                    <Txt variant="bodyMedium" script="latin" style={styles.summaryValue}>
                      {value}
                    </Txt>
                  </View>
                ))}
            </View>
            <Btn label={t('ui.booking.backToHome')} onPress={() => router.replace('/(tabs)')} />
          </Card>
        </Screen>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('ui.booking.guestTitle')}
        subtitle={[centre?.name, doctorName].filter(Boolean).join(' · ') || undefined}
        back
        onBack={back}
      >
        <View style={styles.progress}>
          <StepProgress steps={steps} current={stepIndex} onDark />
        </View>
      </ScreenHeader>

      <Screen withNav scrollResetKey={step}>
        {step === 'centre' ? (
          <CentreStep
            locations={centres.map(asLocation)}
            loading={loadingCentres || (locating && !notice)}
            selected={centre ? asLocation(centre) : null}
            distances={distances}
            notice={notice}
            locating={locating}
            onUseLocation={
              notice === t('ui.booking.locationOff') ? () => void locate(centres, true) : undefined
            }
            onSelect={(l) => {
              const c = centres.find((x) => x.id === l.id);
              if (c) void pickCentre(c, { kind: 'picked', km: distances[c.id] });
            }}
          />
        ) : null}

        {step === 'doctor' && centre ? (
          <>
            <CentreBanner
              name={centre.name}
              line={
                why.kind === 'nearest'
                  ? t('ui.booking.nearestCentre', { km: why.km ?? 0 })
                  : why.kind === 'last'
                  ? t('ui.booking.lastCentre')
                  : undefined
              }
              onChange={() => {
                setNotice(undefined);
                setStep('centre');
              }}
              changeLabel={t('ui.booking.changeCentre')}
            />

            {/* "Any doctor" is a real answer: the patient wants to be seen,
                and the team knows who is free. */}
            <Pressable
              onPress={() => {
                setDoctor('any');
                setStep('details');
              }}
              accessibilityRole="button"
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card tone="plain" selected={doctor === 'any'} style={styles.anyRow}>
                <View style={styles.anyIcon}>
                  <Users size={16} color={PALETTE.purple} strokeWidth={2.2} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="bodyMedium">{t('ui.booking.anyDoctor')}</Txt>
                  <Txt variant="helperSm" color={TEXT.muted}>
                    {t('ui.booking.anyDoctorHint')}
                  </Txt>
                </View>
              </Card>
            </Pressable>

            <DoctorStep
              doctors={doctors.map(asPractitioner)}
              loading={loadingDoctors}
              selected={doctor && doctor !== 'any' ? asPractitioner(doctor) : null}
              nextFree={{}}
              onViewProfile={(p) => {
                if (p.profileId) router.push(`/doctor/${String(p.profileId)}`);
              }}
              onSelect={(p) => {
                const d = doctors.find((x) => x.id === p.id);
                if (!d) return;
                setDoctor(d);
                setStep('details');
              }}
            />
          </>
        ) : null}

        {step === 'details' && centre ? (
          <View>
            <Txt variant="body" color={TEXT.secondary} style={styles.intro}>
              {t('ui.booking.guestBody')}
            </Txt>

            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.booking.preferredDay')}
            </Txt>
            <View style={styles.chips}>
              {days.map((d, i) => (
                <Chip
                  key={d}
                  label={dayLabel(d, i)}
                  selected={day === d}
                  onPress={() => setDay(d)}
                  latin={i > 1}
                />
              ))}
            </View>

            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.booking.preferredTime')}
            </Txt>
            <View style={styles.slots}>
              {SLOTS.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => setSlot(s.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: slot === s.key }}
                  style={[styles.slot, slot === s.key && styles.slotOn]}
                >
                  <Txt variant="bodyMedium" color={slot === s.key ? PALETTE.midnight : TEXT.primary}>
                    {s.label}
                  </Txt>
                  <Txt variant="helperSm" color={TEXT.muted}>
                    {s.hint}
                  </Txt>
                </Pressable>
              ))}
            </View>

            <Txt variant="section" style={styles.detailsTitle}>
              {t('ui.booking.yourDetails')}
            </Txt>
            <Field
              icon={<UserRound size={15} color={TEXT.muted} strokeWidth={2} />}
              label={t('ui.guest.yourName')}
              placeholder={t('ui.guest.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={touched && !nameOk ? t('ui.guest.nameError') : undefined}
              containerStyle={styles.field}
            />
            <PhoneField
              label={t('ui.guest.yourNumber')}
              countryCode={countryCode}
              onCountryCode={setCountryCode}
              value={phone}
              onChangeText={setPhone}
              error={touched && !phoneOk ? t('ui.guest.phoneError') : undefined}
              containerStyle={styles.field}
            />

            <Btn
              label={t('ui.booking.sendRequest')}
              onPress={() => void send()}
              loading={sending}
              disabled={touched && (!nameOk || !phoneOk)}
              style={styles.send}
            />

            <Pressable onPress={loginForSlots} accessibilityRole="button" style={styles.loginRow}>
              <Txt variant="helper" color={PALETTE.deepBlue} center style={styles.link}>
                {t('ui.booking.loginForSlots')}
              </Txt>
            </Pressable>
          </View>
        ) : null}
      </Screen>
    </View>
  );
}

/** "Gurugram · Nearest centre 3.1 km   Change centre" above the doctors. */
export function CentreBanner({
  name,
  line,
  onChange,
  changeLabel,
}: {
  name: string;
  line?: string;
  onChange: () => void;
  changeLabel: string;
}) {
  return (
    <Card tone="info" style={styles.banner}>
      <View style={styles.bannerIcon}>
        <MapPin size={15} color={PALETTE.purple} strokeWidth={2.2} />
      </View>
      <View style={styles.flex}>
        <Txt variant="bodyMedium" script="latin" numberOfLines={1}>
          {name}
        </Txt>
        {line ? (
          <Txt variant="helperSm" color={TEXT.secondary}>
            {line}
          </Txt>
        ) : null}
      </View>
      <Pressable onPress={onChange} hitSlop={10} accessibilityRole="button">
        <Txt variant="helper" color={PALETTE.purple}>
          {changeLabel}
        </Txt>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  pressed: { opacity: 0.9 },
  progress: { marginTop: SPACE.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  anyIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.cardSm,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { marginBottom: SPACE.md },
  label: { marginBottom: SPACE.xs },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginBottom: SPACE.md,
  },
  slots: { flexDirection: 'row', gap: SPACE.xs, marginBottom: SPACE.lg },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.chip,
    borderWidth: 1.4,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
  },
  slotOn: { borderColor: PALETTE.purple, backgroundColor: SURFACE.tint },
  detailsTitle: { marginBottom: SPACE.sm },
  field: { marginBottom: SPACE.md },
  send: { marginTop: SPACE.xs },
  loginRow: { minHeight: 44, justifyContent: 'center', marginTop: SPACE.xs },
  link: { textDecorationLine: 'underline' },
  doneCard: { alignItems: 'stretch', gap: SPACE.sm, paddingVertical: SPACE.xl },
  doneBadge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    backgroundColor: SURFACE.info,
    borderRadius: RADIUS.chip,
    padding: SPACE.sm,
    gap: SPACE.xs,
    marginVertical: SPACE.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm },
  summaryValue: { flex: 1, textAlign: 'right' },
});
