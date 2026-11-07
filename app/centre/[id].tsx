import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Building2,
  Clock,
  MapPin,
  Navigation,
  PhoneCall,
  PlayCircle,
} from 'lucide-react-native';
import {
  Accordion,
  Btn,
  Card,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { DoctorCard } from '@/components/explore/DoctorCard';
import { ReviewCard } from '@/components/explore/ReviewCard';
import { CareBuddyCta } from '@/components/explore/CareBuddyCta';
import { useT } from '@/contexts/LanguageContext';
import { getCentreDetail, type CentreDetail } from '@/services/doctors';
import { openDirections } from '@/services/directions';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * A single centre — the same content the website's centre page carries.
 *
 * One request serves the whole page: `/app-centres/:id` returns the centre, its
 * bookable doctors, FAQs, reviews and content sections together, because
 * fetching all 47 doctors to show six would be wasteful.
 *
 * The doctors are Docpulse's list for this location (who actually has a
 * schedule here), joined to the CMS for photos. `doctorSource` says whether
 * that worked; when it falls back to the CMS picks the list is still correct,
 * just shorter.
 *
 * Every block is conditional. The CMS is unevenly filled: `about` is long for
 * the Delhi centres and empty for several Bangalore ones, only Gurugram has
 * opening hours, and some `sections` rows are blank placeholders.
 */

/** Renders one opening-hours entry whatever shape the CMS stored it in. */
function hoursLine(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    const day = e.day ?? e.name ?? e.label ?? '';
    const time =
      e.time ??
      e.hours ??
      e.value ??
      [e.open, e.close].filter(Boolean).join(' – ');
    return [day, time].filter(Boolean).join(': ');
  }
  return '';
}

export default function CentreDetailScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<CentreDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!id) return;
    setState('loading');
    try {
      const res = await getCentreDetail(String(id));
      if (!res) {
        setState('error');
        return;
      }
      setData(res);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const centre = data?.centre;

  const call = () => {
    if (!centre?.phone) return;
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    Linking.openURL(`${scheme}${centre.phone}`).catch(() => {});
  };

  /** Opens the booking flow with this centre already chosen. */
  const book = () => {
    if (!centre) return;
    router.push({
      pathname: '/(tabs)/book',
      params: {
        // The Docpulse location, so the flow can skip the centre step.
        centreId: data?.locationId ?? '',
      },
    });
  };

  const requestCallback = () => router.push('/guest/callback');

  const hours = (centre?.businessHours ?? [])
    .map(hoursLine)
    .filter((l) => l.length > 0);

  // The virtual-tour section is a video; the rest are prose.
  const videoSections = (data?.sections ?? []).filter(
    (s) => s.video && s.type === 'video_url'
  );
  const textSections = (data?.sections ?? []).filter(
    (s) => !s.video && s.body
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={centre?.name ?? t('ui.guest.ourCentres')}
        subtitle={centre?.city || undefined}
        back
      />

      <Screen withNav>
        {state === 'loading' ? (
          <SkeletonList count={5} lines={2} />
        ) : state === 'error' || !centre || !data ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<Building2 size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : (
          <>
            {centre.image ? (
              <Image
                source={{ uri: centre.image }}
                style={styles.banner}
                resizeMode="cover"
                accessibilityLabel={centre.name}
              />
            ) : null}

            <Card tone="plain" style={styles.card}>
              <View style={styles.addressRow}>
                <MapPin size={15} color={PALETTE.purple} strokeWidth={2.2} />
                {/* Addresses are place data — Latin in both languages. */}
                <Txt
                  variant="bodySm"
                  color={TEXT.secondary}
                  script="latin"
                  style={styles.flex}
                >
                  {centre.address}
                </Txt>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => openDirections(centre)}
                  accessibilityRole="button"
                  accessibilityLabel={t('ui.booking.directions')}
                  style={styles.action}
                >
                  <Navigation
                    size={13}
                    color={PALETTE.midnight}
                    strokeWidth={2.2}
                  />
                  <Txt variant="helperSm">{t('ui.booking.directions')}</Txt>
                </Pressable>
                {centre.phone ? (
                  <Pressable
                    onPress={call}
                    accessibilityRole="button"
                    accessibilityLabel={t('ui.booking.callCentre')}
                    style={styles.action}
                  >
                    <PhoneCall
                      size={13}
                      color={PALETTE.midnight}
                      strokeWidth={2.2}
                    />
                    <Txt variant="helperSm">{t('ui.booking.callCentre')}</Txt>
                  </Pressable>
                ) : null}
              </View>
            </Card>

            <Btn
              label={t('ui.explore.bookHere')}
              onPress={book}
              style={styles.book}
            />

            {/* ------------------------------------------------- doctors */}
            {data.doctors.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.doctorsHere')}
                </Txt>
                <Txt
                  variant="helperSm"
                  color={TEXT.muted}
                  style={styles.sectionNote}
                >
                  {t('ui.explore.doctorsAtCentre', {
                    count: data.doctors.length,
                  })}
                </Txt>
                {data.doctors.map((d) => (
                  <DoctorCard
                    key={d.id}
                    doctor={d}
                    // Naming this centre on every card would repeat the title.
                    showCentres={false}
                    // A doctor with no website record has no profile to open,
                    // so the row books instead.
                    onPress={() =>
                      d.profileId
                        ? router.push(`/doctor/${d.profileId}`)
                        : book()
                    }
                  />
                ))}
              </>
            ) : (
              <Card tone="info" style={styles.note}>
                <Txt variant="bodySm" color={TEXT.secondary}>
                  {t('ui.explore.noDoctorsHere')}
                </Txt>
              </Card>
            )}

            {/* --------------------------------------------------- hours */}
            {hours.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.openingHours')}
                </Txt>
                <Card tone="plain" style={styles.card}>
                  {hours.map((line) => (
                    <View key={line} style={styles.hoursRow}>
                      <Clock size={13} color={TEXT.muted} strokeWidth={2.2} />
                      <Txt
                        variant="helperSm"
                        color={TEXT.secondary}
                        script="latin"
                      >
                        {line}
                      </Txt>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {/* --------------------------------------------------- about */}
            {centre.about ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.aboutCentre')}
                </Txt>
                <Card tone="plain">
                  <Txt
                    variant="bodySm"
                    color={TEXT.secondary}
                    style={styles.body}
                  >
                    {centre.about}
                  </Txt>
                </Card>
              </>
            ) : null}

            {/* ------------------------------------------------ services */}
            {textSections.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.ourServices')}
                </Txt>
                {textSections.map((s, i) => (
                  <Card
                    key={`${s.heading}-${i}`}
                    tone="plain"
                    style={styles.serviceCard}
                  >
                    {/* Numbered as the website does, so the two read alike. */}
                    <View style={styles.serviceTop}>
                      <View style={styles.serviceNum}>
                        <Txt variant="helperSm" color={PALETTE.white} script="latin">
                          {String(i + 1).padStart(2, '0')}
                        </Txt>
                      </View>
                      <Txt variant="bodyMedium" style={styles.flex}>
                        {s.heading}
                      </Txt>
                    </View>
                    {s.body ? (
                      <Txt
                        variant="helperSm"
                        color={TEXT.secondary}
                        numberOfLines={4}
                        style={styles.body}
                      >
                        {s.body}
                      </Txt>
                    ) : null}
                  </Card>
                ))}
              </>
            ) : null}

            {/* ---------------------------------------------- virtual tour */}
            {videoSections.map((s, i) => (
              <Pressable
                key={`${s.video}-${i}`}
                onPress={() => Linking.openURL(s.video!).catch(() => {})}
                accessibilityRole="link"
                accessibilityLabel={t('ui.explore.watchOnYoutube')}
                style={styles.tour}
              >
                <Card tone="plain" style={styles.tourCard}>
                  <PlayCircle size={22} color={PALETTE.purple} strokeWidth={2.2} />
                  <View style={styles.flex}>
                    <Txt variant="bodyMedium" numberOfLines={1}>
                      {s.heading || t('ui.explore.virtualTour')}
                    </Txt>
                    <Txt variant="helperSm" color={TEXT.muted}>
                      {t('ui.explore.watchOnYoutube')}
                    </Txt>
                  </View>
                </Card>
              </Pressable>
            ))}

            {/* ------------------------------------------------- reviews */}
            {data.reviews.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.patientReviews')}
                </Txt>
                <Txt
                  variant="helperSm"
                  color={TEXT.muted}
                  style={styles.sectionNote}
                >
                  {t('ui.explore.reviewsNote')}
                </Txt>
                {data.reviews.map((r, i) => (
                  <ReviewCard key={`${r.name}-${i}`} review={r} />
                ))}
              </>
            ) : null}

            {/* ----------------------------------------------------- faq */}
            {data.faqs.length > 0 ? (
              <>
                <Txt variant="section" style={styles.heading}>
                  {t('ui.explore.faqTitle')}
                </Txt>
                <Accordion items={data.faqs} />
              </>
            ) : null}

            <CareBuddyCta onBook={book} onRequest={requestCallback} />
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  banner: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.card,
    marginBottom: SPACE.md,
    backgroundColor: SURFACE.tint,
  },
  card: { marginBottom: SPACE.sm, gap: SPACE.sm },
  note: { marginBottom: SPACE.sm },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  book: { marginTop: SPACE.xs, marginBottom: SPACE.md },
  heading: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  sectionNote: { marginBottom: SPACE.sm, lineHeight: 16 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  body: { lineHeight: 20 },
  serviceCard: { marginBottom: SPACE.sm, gap: SPACE.xs },
  serviceTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  serviceNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tour: { marginBottom: SPACE.sm },
  tourCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
});
