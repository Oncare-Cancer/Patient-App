import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Screen, ScreenHeader, StepProgress } from '@/components/ui';
import { CentreStep } from '@/components/booking/CentreStep';
import { DoctorStep } from '@/components/booking/DoctorStep';
import { SlotStep } from '@/components/booking/SlotStep';
import { ReviewStep } from '@/components/booking/ReviewStep';
import { ConfirmedStep } from '@/components/booking/ConfirmedStep';
import DoctorProfileModal from '@/components/DoctorProfileModal';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import {
  getLocations,
  getPractitioners,
  getVisitTypes,
  findNextFreeSlot,
  getBookingSlots,
  createAppointment,
  locationOf,
  practitionerOf,
  type BookingSlot,
  type Location,
  type Practitioner,
} from '@/services/booking';
import { formatWhen } from '@/services/appointments';
import { toastError } from '@/utils/toast';
import { NAV_CLEARANCE, SPACE, SURFACE } from '@/constants/theme';

/**
 * C1-C5 — book an appointment.
 *
 * The flow and every API call are the previous screen's; what changed is the
 * shape. It was one long scrolling page with sections, which is why section 07
 * called the flow "long". It is now four explicit steps with a progress bar, so
 * a patient always knows how much is left.
 *
 * The chain is strict: centre decides doctors, doctor decides visit types,
 * visit type decides slots. Changing anything upstream clears everything below
 * it — anything else can produce a booking the API will reject.
 */

type Step = 0 | 1 | 2 | 3 | 4;

/**
 * Loose name comparison, for matching a CMS doctor to a Docpulse practitioner.
 *
 * The two systems share no doctor id, so the name is the only join. Docpulse
 * stores `firstName: "S K", lastName: "Sahoo"` while the CMS stores
 * `"Dr. S K Sahoo"`, so the honorific and all punctuation are discarded.
 */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\bdr\.?\b/g, '')
      .replace(/[^a-z]/g, '');
  return norm(a) === norm(b) && norm(a).length > 0;
}

/** Days of lookahead when finding a doctor's next available slot. */
const NEXT_SLOT_LOOKAHEAD_DAYS = 3;
/** How many doctors are probed at once. */
const SLOT_PROBE_CONCURRENCY = 4;


export default function Book() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient } = useAuth();
  /**
   * Incoming preselection.
   *
   * Two sources share this: the guest-login resume (B6), and the "Book" button
   * on a centre or doctor page.
   *
   * `centreId` is a DOCPULSE locationId, because that is what the booking APIs
   * take. `doctorName` exists because a doctor page cannot supply a Docpulse
   * practitioner id — the CMS and Docpulse share no doctor id — so the doctor
   * is matched by name once this centre's practitioners load.
   */
  const resume = useLocalSearchParams<{
    resumeCentreId?: string;
    resumeDoctorId?: string;
    centreId?: string;
    doctorName?: string;
    resumeVisitType?: string;
    resumeDateTime?: string;
  }>();

  const [step, setStep] = useState<Step>(0);

  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [centre, setCentre] = useState<Location | null>(null);


  const [doctors, setDoctors] = useState<Practitioner[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  /** practitionerId -> "Today 2:00 PM". Absent means not yet known. */
  const [nextFree, setNextFree] = useState<Record<string, string>>({});
  const [doctor, setDoctor] = useState<Practitioner | null>(null);
  const [profileDoctor, setProfileDoctor] = useState<Practitioner | null>(null);

  const [visitTypes, setVisitTypes] = useState<string[]>([]);
  const [visitType, setVisitType] = useState<string | null>(null);


  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');


  /* -------------------------------------------------------------- locations */

  useEffect(() => {
    getLocations()
      .then((list) => setLocations(list.map(locationOf)))
      .catch(() => toastError(t('ui.common.somethingWrong'), t('ui.common.retry')))
      .finally(() => setLoadingLocations(false));
  }, [t]);

  /* ---------------------------------------------------------------- doctors */

  const loadDoctors = useCallback(
    async (loc: Location) => {
      setLoadingDoctors(true);
      setNextFree({});
      try {
        const list = (await getPractitioners(loc.id)).map(practitionerOf);
        setDoctors(list);
      } catch {
        setDoctors([]);
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
      } finally {
        setLoadingDoctors(false);
      }
    },
    [t]
  );

  /**
   * Fills in each doctor's next available slot.
   *
   * This is a real Docpulse lookup, so the card shows an actual time rather
   * than a vague label. It is kept cheap in three ways, because a naive version
   * is dozens of sequential calls just to render a list the patient is
   * skimming:
   *
   *  - 3 days of lookahead, not 7. A doctor with nothing free for three days
   *    reads as "call us" anyway, and the slot step shows the full picture.
   *  - CONCURRENCY lanes in parallel rather than strictly one doctor at a time.
   *  - cancelled on unmount / centre change, so switching centres does not
   *    leave the previous centre's probes running.
   */
  useEffect(() => {
    if (!centre || doctors.length === 0) return;

    let cancelled = false;
    const queue = [...doctors];

    const worker = async () => {
      while (!cancelled) {
        const d = queue.shift();
        if (!d) return;
        try {
          const types = await getVisitTypes(centre.id, d.id);
          const firstType = types[0];
          if (!firstType) continue;

          const free = await findNextFreeSlot({
            locationId: centre.id,
            practitionerId: d.id,
            visitTypeName: firstType,
            days: NEXT_SLOT_LOOKAHEAD_DAYS,
          });
          if (free && !cancelled) {
            setNextFree((prev) => ({ ...prev, [d.id]: free.label }));
          }
        } catch {
          // A doctor whose slots cannot be read simply shows no time.
        }
      }
    };

    void Promise.all(
      Array.from({ length: SLOT_PROBE_CONCURRENCY }, () => worker())
    );

    return () => {
      cancelled = true;
    };
  }, [centre, doctors]);

  /* ------------------------------------------------------------ visit types */

  const loadVisitTypes = useCallback(
    async (loc: Location, doc: Practitioner) => {
      try {
        const types = await getVisitTypes(loc.id, doc.id);
        setVisitTypes(types);
        // One option is not a choice — preselect it, as the old screen did.
        if (types.length === 1) setVisitType(types[0]);
      } catch {
        setVisitTypes([]);
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
      }
    },
    [t]
  );

  /* ------------------------------------------------------------------ slots */

  const loadSlots = useCallback(
    async (when: Date) => {
      if (!centre || !doctor || !visitType) return;
      setLoadingSlots(true);
      setSlot(null);
      try {
        setSlots(
          await getBookingSlots({
            locationId: centre.id,
            practitionerId: doctor.id,
            visitTypeName: visitType,
            date: when,
          })
        );
      } catch {
        setSlots([]);
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
      } finally {
        setLoadingSlots(false);
      }
    },
    [centre, doctor, visitType, t]
  );

  useEffect(() => {
    if (step === 2 && visitType) void loadSlots(date);
    // `loadSlots` changes with its inputs, so it is not in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visitType, date]);

  /* ----------------------------------------------------------------- resume */

  /**
   * B6 — a guest who was picking a doctor lands back here after OTP.
   *
   * Only the centre and doctor are restored, and the patient is dropped on the
   * slot step to choose again. The slot they had in mind may well be gone by
   * now, and silently re-selecting a stale one would take them to a confirm
   * screen for a booking the API would reject.
   */
  const resumedRef = React.useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    if (locations.length === 0) return;

    const wantCentreId = resume.resumeCentreId || resume.centreId;
    const wantDoctorId = resume.resumeDoctorId;
    const wantDoctorName = resume.doctorName;

    if (!wantCentreId && !wantDoctorId && !wantDoctorName) return;

    resumedRef.current = true;

    (async () => {
      const match = wantCentreId
        ? locations.find((l) => l.id === wantCentreId)
        : null;

      // Without a known centre there is nothing to preselect — the patient
      // picks one and the doctor-name match below still applies afterwards.
      if (!match) {
        setStep(0);
        return;
      }
      setCentre(match);

      const list = (await getPractitioners(match.id).catch(() => [])).map(
        practitionerOf
      );
      setDoctors(list);

      // By id when resuming, by name when arriving from a doctor page.
      const doc =
        (wantDoctorId && list.find((d) => d.id === wantDoctorId)) ||
        (wantDoctorName && list.find((d) => sameName(d.name, wantDoctorName))) ||
        null;

      if (!doc) {
        // Centre is known but the doctor is not bookable here (or was not
        // specified) — land on the doctor step with the list already loaded.
        setStep(1);
        return;
      }

      setDoctor(doc);
      await loadVisitTypes(match, doc);
      if (resume.resumeVisitType) setVisitType(resume.resumeVisitType);
      setStep(2);
    })();
  }, [locations, resume, loadVisitTypes]);

  /* ----------------------------------------------------------------- submit */

  const confirm = async () => {
    if (!centre || !doctor || !visitType || !slot || submitting) return;
    setSubmitting(true);
    try {
      const res = await createAppointment({
        practitionerId: doctor.id,
        locationId: centre.id,
        dateTime: slot,
        visitTypeName: visitType,
      });

      setBookingId(
        String(res?.appointmentId ?? res?.id ?? res?.bookingId ?? '—')
      );
      setStep(4);
    } catch {
      // A slot can be taken between loading and confirming, which is the most
      // likely failure here — so the message says so rather than "try again".
      toastError(t('ui.booking.bookFailed'), t('ui.booking.bookFailedBody'));
      setStep(2);
      void loadSlots(date);
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------------------------------- labels */

  const dates = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    []
  );

  const visitLabel = visitType ?? '';

  // `label` ("name, area"), not `name` — Docpulse gives every centre the same
  // name, so `name` alone reads as "Oncare Cancer Center" on every booking.
  const centreLabel = centre ? centre.label : '';
  const patientLabel = [
    patient?.patient_name,
    patient?.patient_id ? `UID ${patient.patient_id}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const steps = [
    t('ui.booking.stepCentre'),
    t('ui.booking.stepDoctor'),
    t('ui.booking.stepSlot'),
    t('ui.booking.stepConfirm'),
  ];

  /* ----------------------------------------------------------------- render */

  const back = () => {
    if (step === 0) {
      router.replace('/(tabs)');
      return;
    }
    setStep((s) => (s - 1) as Step);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        // Step 4 gets its own title rather than none: leaving it undefined
        // rendered an empty navy bar with only the SOS pill floating in it.
        title={step === 4 ? t('ui.booking.confirmedTitle') : t('ui.booking.title')}
        subtitle={
          step > 0 && step < 4
            ? [centreLabel, doctor?.name].filter(Boolean).join(' · ')
            : undefined
        }
        back={step !== 4}
        onBack={back}
      >
        {step < 4 ? (
          <View style={styles.progress}>
            <StepProgress steps={steps} current={Math.min(step, 3)} onDark />
          </View>
        ) : null}
      </ScreenHeader>

      {/* Each step starts at the top rather than inheriting the previous
          step's scroll position. */}
      <Screen withNav scrollResetKey={step}>
        {step === 0 ? (
          <CentreStep
            locations={locations}
            loading={loadingLocations}
            selected={centre}
            onSelect={(l) => {
              setCentre(l);
              // Changing the centre invalidates everything downstream.
              setDoctor(null);
              setVisitTypes([]);
              setVisitType(null);
              setSlots([]);
              setSlot(null);
              void loadDoctors(l);
              // Straight on — picking one of nine centres needs no confirming.
              setStep(1);
            }}
          />
        ) : null}

        {step === 1 ? (
          <DoctorStep
            doctors={doctors}
            loading={loadingDoctors}
            selected={doctor}
            nextFree={nextFree}
            onViewProfile={setProfileDoctor}
            onSelect={(d) => {
              setDoctor(d);
              setVisitType(null);
              setSlots([]);
              setSlot(null);
              if (centre) void loadVisitTypes(centre, d);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 ? (
          <SlotStep
            visitTypes={visitTypes}
            visitType={visitType}
            onVisitType={(v) => {
              setVisitType(v);
              setSlot(null);
            }}
            dates={dates}
            date={date}
            onDate={setDate}
            slots={slots}
            loadingSlots={loadingSlots}
            selectedSlot={slot}
            onSlot={setSlot}
          />
        ) : null}

        {step === 3 && doctor && slot ? (
          <ReviewStep
            doctorName={doctor.name}
            doctorSpeciality={
              doctor.speciality ? String(doctor.speciality) : undefined
            }
            visitLabel={visitLabel}
            whenLabel={formatWhen(slot)}
            centreLabel={centreLabel}
            patientLabel={patientLabel}
            onEdit={() => setStep(0)}
            onConfirm={confirm}
            submitting={submitting}
          />
        ) : null}

        {step === 4 && doctor && slot ? (
          <ConfirmedStep
            bookingId={bookingId}
            doctor={doctor}
            whenLabel={formatWhen(slot)}
            visitLabel={visitLabel}
            centreLabel={centreLabel}
            onViewProfile={() => setProfileDoctor(doctor)}
            onViewAppointments={() => router.replace('/(tabs)/appointments')}
            onHome={() => router.replace('/(tabs)')}
          />
        ) : null}
      </Screen>

      {/*
        Sticky CTA for the slot step.

        It lives here rather than inside SlotStep because it has to sit outside
        the scroll view to stay pinned. It appears only once a time is actually
        chosen, so it does not cover slots while the patient is still browsing
        them, and it clears the floating nav by NAV_CLEARANCE.
      */}
      {step === 2 && slot ? (
        <View
          style={[
            styles.stickyBar,
            { paddingBottom: Math.max(insets.bottom, SPACE.xs) + NAV_CLEARANCE },
          ]}
          pointerEvents="box-none"
        >
          <Btn
            label={t('ui.booking.reviewBooking')}
            onPress={() => setStep(3)}
            disabled={!visitType || !slot}
          />
        </View>
      ) : null}

      {/* Reused as-is. It takes no `visible` prop and renders its own Modal, so
          it is mounted only while a doctor is selected. */}
      {profileDoctor ? (
        <DoctorProfileModal
          doctor={profileDoctor}
          onClose={() => setProfileDoctor(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  progress: { marginTop: SPACE.md },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.gutter,
    paddingTop: SPACE.sm,
    backgroundColor: SURFACE.screen,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
});
