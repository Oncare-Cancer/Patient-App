import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, ScreenHeader, StepProgress } from '@/components/ui';
import { CentreStep } from '@/components/booking/CentreStep';
import { DoctorStep } from '@/components/booking/DoctorStep';
import { SlotStep } from '@/components/booking/SlotStep';
import { ReviewStep } from '@/components/booking/ReviewStep';
import { ConfirmedStep } from '@/components/booking/ConfirmedStep';
import DoctorProfileModal from '@/components/DoctorProfileModal';
import { useAttachments } from '@/hooks/useAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import {
  getLocations,
  getPractitioners,
  getVisitTypes,
  getBookingSlots,
  createAppointment,
  findNextFreeSlot,
  locationOf,
  practitionerOf,
  type BookingSlot,
  type Location,
  type Practitioner,
} from '@/services/booking';
import { uploadFiles } from '@/services/upload';
import { formatWhen } from '@/services/appointments';
import { toastError } from '@/utils/toast';
import { SPACE, SURFACE } from '@/constants/theme';

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

/** Slot probing is N requests per doctor, so only a short list is worth it. */
const MAX_DOCTORS_TO_PROBE = 6;

export default function Book() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();
  const resume = useLocalSearchParams<{
    resumeCentreId?: string;
    resumeDoctorId?: string;
    resumeVisitType?: string;
    resumeDateTime?: string;
  }>();

  const [step, setStep] = useState<Step>(0);

  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [centre, setCentre] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);

  const [doctors, setDoctors] = useState<Practitioner[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctor, setDoctor] = useState<Practitioner | null>(null);
  const [nextFree, setNextFree] = useState<Record<string, string>>({});
  const [profileDoctor, setProfileDoctor] = useState<Practitioner | null>(null);

  const [visitTypes, setVisitTypes] = useState<string[]>([]);
  const [visitType, setVisitType] = useState<string | null>(null);
  const [mode, setMode] = useState<'centre' | 'video'>('centre');

  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');

  const attach = useAttachments();

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
   * Fills in each doctor's next free slot, one doctor at a time.
   *
   * Sequential rather than parallel on purpose: this is up to 7 slot requests
   * per doctor and firing them all at once would mean dozens of simultaneous
   * calls into Docpulse for one screen.
   */
  useEffect(() => {
    if (!centre || doctors.length === 0 || doctors.length > MAX_DOCTORS_TO_PROBE)
      return;

    let cancelled = false;

    (async () => {
      for (const d of doctors) {
        if (cancelled) return;
        try {
          const types = await getVisitTypes(centre.id, d.id);
          const firstType = types[0];
          if (!firstType) continue;
          const free = await findNextFreeSlot({
            locationId: centre.id,
            practitionerId: d.id,
            visitTypeName: firstType,
            days: 7,
          });
          if (free && !cancelled) {
            setNextFree((prev) => ({ ...prev, [d.id]: free.label }));
          }
        } catch {
          // A doctor whose slots cannot be read simply shows no chip.
        }
      }
    })();

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
    if (!resume.resumeDoctorId && !resume.resumeCentreId) return;

    resumedRef.current = true;

    (async () => {
      const loc =
        locations.find((l) => l.id === resume.resumeCentreId) ?? locations[0];
      if (!loc) return;
      setCentre(loc);

      const list = (await getPractitioners(loc.id).catch(() => [])).map(
        practitionerOf
      );
      setDoctors(list);

      const doc = list.find((d) => d.id === resume.resumeDoctorId);
      if (!doc) {
        // Doctor no longer at this centre — leave them on the doctor step.
        setStep(1);
        return;
      }

      setDoctor(doc);
      await loadVisitTypes(loc, doc);
      if (resume.resumeVisitType) setVisitType(resume.resumeVisitType);
      setStep(2);
    })();
  }, [locations, resume, loadVisitTypes]);

  /* ----------------------------------------------------------------- submit */

  const confirm = async () => {
    if (!centre || !doctor || !visitType || !slot || submitting) return;
    setSubmitting(true);
    try {
      // Reports go up first and are filed as reports, so they appear in Records
      // as the design's "Saved to your Records too" promises.
      if (attach.files.length > 0) {
        await uploadFiles(attach.files, 'report');
      }

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

  const visitLabel = [
    visitType,
    mode === 'video' ? t('ui.booking.videoCall') : t('ui.booking.atCentre'),
  ]
    .filter(Boolean)
    .join(' · ');

  const centreLabel = centre ? String(centre.name) : '';
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
        title={step === 4 ? undefined : t('ui.booking.title')}
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

      <Screen withNav>
        {step === 0 ? (
          <CentreStep
            locations={locations}
            loading={loadingLocations}
            selected={centre}
            locating={locating}
            onUseLocation={() => {
              // Distance needs centre coordinates, which the Docpulse location
              // payload does not carry. Wired to the backend centre master once
              // it exists; until then this is a no-op rather than a fake sort.
              setLocating(true);
              setTimeout(() => setLocating(false), 400);
            }}
            onSelect={(l) => {
              setCentre(l);
              // Changing the centre invalidates everything downstream.
              setDoctor(null);
              setVisitTypes([]);
              setVisitType(null);
              setSlots([]);
              setSlot(null);
              void loadDoctors(l);
            }}
            onContinue={() => setStep(1)}
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
            }}
            onContinue={() => setStep(2)}
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
            mode={mode}
            onMode={setMode}
            dates={dates}
            date={date}
            onDate={setDate}
            slots={slots}
            loadingSlots={loadingSlots}
            selectedSlot={slot}
            onSlot={setSlot}
            onReview={() => setStep(3)}
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
            reason={reason}
            onReason={setReason}
            attach={attach}
            onEdit={() => setStep(0)}
            onConfirm={confirm}
            submitting={submitting}
          />
        ) : null}

        {step === 4 && doctor && slot ? (
          <ConfirmedStep
            bookingId={bookingId}
            doctorName={doctor.name}
            whenLabel={formatWhen(slot)}
            whenIso={slot}
            centreLabel={centreLabel}
            onViewAppointments={() => router.replace('/(tabs)/appointments')}
            onHome={() => router.replace('/(tabs)')}
          />
        ) : null}
      </Screen>

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
});
