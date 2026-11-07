import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Image, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Award,
  BookOpen,
  Briefcase,
  ChevronRight,
  GraduationCap,
  Languages as LanguagesIcon,
  MapPin,
  Sparkles,
  Stethoscope,
  User,
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
import { CareBuddyCta } from '@/components/explore/CareBuddyCta';
import { useT } from '@/contexts/LanguageContext';
import { doctorApi, type DoctorProfile } from '@/services/doctors';
import { PALETTE, RADIUS, SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * A doctor's profile — the same content the website's doctor page carries.
 *
 * The centre list is what makes "Book with this doctor" possible: the CMS
 * leaves every doctor's own `centres[]` empty and records the relationship on
 * the centre instead (`doctorSection.doctorList`), so the backend reverses that
 * mapping. Without it the page could not say where to book.
 *
 * `languages`, `memberships`, `videos` and `blogs` are empty for most doctors
 * in the CMS today, so every block below is conditional.
 */

/** A titled block with an icon, used for every profile section. */
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.heading}>
        {icon}
        <Txt variant="section">{title}</Txt>
      </View>
      {children}
    </>
  );
}

/** A simple bulleted list, as the website renders these. */
function Bullets({ items }: { items: string[] }) {
  return (
    <Card tone="plain" style={styles.listCard}>
      {items.map((line, i) => (
        <View key={`${line}-${i}`} style={styles.bulletRow}>
          <View style={styles.dot} />
          {/* Clinical and institutional names stay Latin. */}
          <Txt
            variant="bodySm"
            color={TEXT.secondary}
            script="latin"
            style={styles.flex}
          >
            {line}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

export default function DoctorProfileScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!id) return;
    setState('loading');
    try {
      const d = await doctorApi.get(String(id));
      if (!d) {
        setState('error');
        return;
      }
      setDoctor(d);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Opens booking with this doctor's centre preselected.
   *
   * A doctor sits at several centres, so the centre cannot be assumed — but
   * when there is exactly one it is passed through and the flow skips a step.
   */
  const book = () => {
    /*
     * Only the name is passed, not an id.
     *
     * The centres listed here are CMS records, whose ids are unrelated to the
     * Docpulse locationIds the booking APIs take — and this doctor's Docpulse
     * practitioner id is equally unknown here. Sending a CMS id would silently
     * fail to match. The flow matches the doctor by name once the patient
     * picks a centre and its practitioners load.
     */
    router.push({
      pathname: '/(tabs)/book',
      params: { doctorName: doctor?.name ?? '' },
    });
  };

  const requestCallback = () => router.push('/guest/callback');

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={doctor?.name ?? t('ui.booking.doctor')}
        subtitle={doctor?.speciality || undefined}
        back
      />

      <Screen withNav>
        {state === 'loading' ? (
          <SkeletonList count={5} lines={2} />
        ) : state === 'error' || !doctor ? (
          <ErrorState
            onRetry={() => void load()}
            icon={
              <Stethoscope size={22} color={PALETTE.purple} strokeWidth={2} />
            }
          />
        ) : (
          <>
            {/* ---------------------------------------------------- hero */}
            <Card tone="plain" style={styles.headCard}>
              <View style={styles.avatar}>
                {doctor.img ? (
                  <Image
                    source={{ uri: doctor.img }}
                    style={styles.photo}
                    resizeMode="cover"
                    accessibilityLabel={doctor.imgAlt ?? doctor.name}
                  />
                ) : (
                  <User size={40} color={PALETTE.purple} strokeWidth={2} />
                )}
              </View>

              {/* Name, speciality and experience are record data — Latin. */}
              <Txt variant="titleLg" script="latin" center>
                {doctor.name}
              </Txt>
              {doctor.speciality ? (
                <Txt
                  variant="helper"
                  color={PALETTE.purple}
                  script="latin"
                  center
                >
                  {doctor.speciality}
                </Txt>
              ) : null}
              {doctor.experience ? (
                // Already carries its unit ("7+ Years") — nothing appended.
                <Txt variant="helperSm" color={TEXT.muted} script="latin" center>
                  {doctor.experience}
                </Txt>
              ) : null}
              {doctor.subheading ? (
                <Txt
                  variant="helperSm"
                  color={TEXT.secondary}
                  script="latin"
                  center
                  style={styles.subheading}
                >
                  {doctor.subheading}
                </Txt>
              ) : null}
            </Card>

            <Btn
              label={t('ui.explore.bookNow')}
              onPress={book}
              style={styles.book}
            />

            {/* ------------------------------------------------- centres */}
            {doctor.centres.length > 0 ? (
              <Section
                icon={<MapPin size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.practisesAt')}
              >
                {doctor.centres.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push(`/centre/${c.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={c.name}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Card tone="plain" style={styles.centreCard}>
                      <MapPin size={14} color={PALETTE.purple} strokeWidth={2.2} />
                      <View style={styles.flex}>
                        <Txt variant="helper" script="latin" numberOfLines={1}>
                          {c.name}
                        </Txt>
                        {c.address ? (
                          <Txt
                            variant="helperSm"
                            color={TEXT.muted}
                            script="latin"
                            numberOfLines={2}
                          >
                            {c.address}
                          </Txt>
                        ) : null}
                      </View>
                      <ChevronRight
                        size={15}
                        color={TEXT.muted}
                        strokeWidth={2.2}
                      />
                    </Card>
                  </Pressable>
                ))}
              </Section>
            ) : null}

            {/* --------------------------------------------------- about */}
            {doctor.about ? (
              <Section
                icon={<User size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.about')}
              >
                <Card tone="plain">
                  <Txt
                    variant="bodySm"
                    color={TEXT.secondary}
                    style={styles.body}
                  >
                    {doctor.about}
                  </Txt>
                </Card>
              </Section>
            ) : null}

            {/* ----------------------------------------------- expertise */}
            {doctor.expertise.length > 0 ? (
              <Section
                icon={<Sparkles size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.expertise')}
              >
                {/* A two-column chip grid, as the website lays these out. */}
                <View style={styles.chipGrid}>
                  {doctor.expertise.map((e, i) => (
                    <View key={`${e}-${i}`} style={styles.chip}>
                      <Txt
                        variant="helperSm"
                        script="latin"
                        numberOfLines={2}
                      >
                        {e}
                      </Txt>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            {/* ----------------------------------------------- education */}
            {doctor.education.length > 0 ? (
              <Section
                icon={
                  <GraduationCap
                    size={15}
                    color={PALETTE.purple}
                    strokeWidth={2.2}
                  />
                }
                title={t('ui.explore.educationTitle')}
              >
                <Bullets items={doctor.education} />
              </Section>
            ) : null}

            {/* ---------------------------------------- advanced training */}
            {doctor.advancedTraining ? (
              <Section
                icon={<Sparkles size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.advancedTraining')}
              >
                <Card tone="plain">
                  <Txt
                    variant="bodySm"
                    color={TEXT.secondary}
                    script="latin"
                    style={styles.body}
                  >
                    {doctor.advancedTraining}
                  </Txt>
                </Card>
              </Section>
            ) : null}

            {/* ---------------------------------------------- experience */}
            {doctor.pastExperience.length > 0 ? (
              <Section
                icon={<Briefcase size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.professionalExperience')}
              >
                <Bullets items={doctor.pastExperience} />
              </Section>
            ) : null}

            {/* -------------------------------------------------- awards */}
            {doctor.awards.length > 0 ? (
              <Section
                icon={<Award size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.awardsTitle')}
              >
                <Bullets items={doctor.awards} />
              </Section>
            ) : null}

            {/* -------------------------------------------- publications */}
            {doctor.publications.length > 0 ? (
              <Section
                icon={<BookOpen size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.publications')}
              >
                {doctor.publications.map((p, i) => {
                  const open = () =>
                    p.link && Linking.openURL(p.link).catch(() => {});
                  return (
                    <Pressable
                      key={`${p.title}-${i}`}
                      onPress={p.link ? open : undefined}
                      accessibilityRole={p.link ? 'link' : 'text'}
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <Card tone="plain" style={styles.pubCard}>
                        {p.journal ? (
                          <Txt
                            variant="helperSm"
                            color={PALETTE.purple}
                            script="latin"
                          >
                            {p.journal.toUpperCase()}
                          </Txt>
                        ) : null}
                        <Txt variant="bodySm" script="latin">
                          {p.title}
                        </Txt>
                      </Card>
                    </Pressable>
                  );
                })}
              </Section>
            ) : null}

            {/* ------------------------------------------------ languages */}
            {doctor.languages.length > 0 ? (
              <Section
                icon={
                  <LanguagesIcon
                    size={15}
                    color={PALETTE.purple}
                    strokeWidth={2.2}
                  />
                }
                title={t('ui.explore.languages')}
              >
                <Card tone="plain">
                  <Txt variant="bodySm" color={TEXT.secondary} script="latin">
                    {doctor.languages.join(', ')}
                  </Txt>
                </Card>
              </Section>
            ) : null}

            {/* ------------------------------------------------------ faq */}
            {doctor.faqs.length > 0 ? (
              <Section
                icon={<BookOpen size={15} color={PALETTE.purple} strokeWidth={2.2} />}
                title={t('ui.explore.faqTitle')}
              >
                <Accordion items={doctor.faqs} />
              </Section>
            ) : null}

            <CareBuddyCta
              onBook={book}
              onRequest={requestCallback}
              title={t('ui.explore.bookWithDoctor', { name: doctor.name })}
              subtitle={t('ui.explore.estimateFor', { name: doctor.name })}
            />
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  headCard: { alignItems: 'center', gap: 2 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.card,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: SPACE.sm,
  },
  photo: { width: '100%', height: '100%' },
  subheading: { marginTop: SPACE.xs, lineHeight: 17 },
  book: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  centreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  chip: {
    // Two across, accounting for the gap between them.
    width: '48.5%',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.cardSm,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
  },
  listCard: { gap: SPACE.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PALETTE.purple,
    marginTop: 7,
  },
  pubCard: { marginBottom: SPACE.xs, gap: 2 },
  body: { lineHeight: 20 },
  pressed: { opacity: 0.9 },
});
