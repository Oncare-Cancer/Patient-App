import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Pill,
  Search,
  Sparkles,
  Upload,
  AlertTriangle,
} from 'lucide-react-native';
import {
  AttachSheet,
  ApproxPrice,
  Btn,
  Card,
  Chip,
  Field,
  PriceNote,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
  UploadField,
} from '@/components/ui';
import { CartLine } from '@/components/services/CartLine';
import { MedicineCard } from '@/components/services/MedicineCard';
import { useAttachments } from '@/hooks/useAttachments';
import { useDebounced } from '@/hooks/useDebounced';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { searchMedicines, type Medicine } from '@/services/catalog';
import { createRequest, type RequestLine } from '@/services/requests';
import { useDraftSync } from '@/hooks/useDraftSync';
import { readPrescription, needsCarefulCheck } from '@/services/prescriptionAi';
import { uploadFiles } from '@/services/upload';
import { toastError } from '@/utils/toast';
import {
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * F1-F3 — Order medicines.
 *
 * All three steps live in one screen because they share one cart. Splitting them
 * across routes would mean lifting cart state into a context that only this flow
 * uses, and "Edit cart" on F3 is a step change rather than a navigation.
 *
 * The flow never blocks on our data being complete: a medicine the catalogue
 * cannot price, or cannot find at all, still goes in the cart and still
 * submits. The pharmacist resolves it on the call — which is what the design's
 * own "What happens next" list promises.
 */

type Step = 'choose' | 'cart' | 'delivery';
type Delivery = 'home' | 'pickup';
type NeededFor = '7days' | 'prescribed' | 'some';

export default function Medicines() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();

  const [step, setStep] = useState<Step>('choose');
  // Opens on the catalogue rather than on an empty screen. The two tiles are
  // still the choice the PDF makes, but "Search & add" is the one that has
  // something to show immediately, so it starts selected and the browse list
  // below it is populated before the patient types anything.
  const [mode, setMode] = useState<'upload' | 'search' | null>('search');
  const [lines, setLines] = useState<RequestLine[]>([]);
  const [reading, setReading] = useState(false);
  const [carefulCheck, setCarefulCheck] = useState(false);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [searching, setSearching] = useState(false);

  const [delivery, setDelivery] = useState<Delivery>('home');
  const [address, setAddress] = useState('');
  const [neededFor, setNeededFor] = useState<NeededFor>('prescribed');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Persists the cart as it changes so the central team can see and
  // follow up on carts that are never submitted.
  useDraftSync('medicine', lines, submitting);

  const attach = useAttachments();
  const debounced = useDebounced(search, 350);

  /* ------------------------------------------------------------ search */

  // No search term asks the backend for its default browse list — medicines
  // grouped by drug, most-stocked first — instead of clearing the screen.
  useEffect(() => {
    if (mode !== 'search') return;
    setSearching(true);
    searchMedicines({ search: debounced.trim() || undefined, limit: 20 })
      .then((page) => setResults(page.list))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [mode, debounced]);

  const browsing = !debounced.trim();

  const addFromCatalog = (m: Medicine) => {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.catalogId === m.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = {
          ...next[existing],
          quantity: (next[existing].quantity ?? 1) + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          name: m.displayName,
          quantity: 1,
          catalogId: m.id,
          // Picked from the catalogue, so the only open question is the price.
          matchStatus: m.price === null ? 'unpriced' : 'matched',
          approxPrice: m.price,
        },
      ];
    });
  };

  /* ----------------------------------------------------- read prescription */

  const readUploaded = useCallback(async () => {
    if (attach.files.length === 0) return;
    setReading(true);
    try {
      const fileKeys = await uploadFiles(attach.files, 'prescription');
      const read = await readPrescription({ fileKeys, want: 'medicines' });
      setLines(read.lines);
      setCarefulCheck(needsCarefulCheck(read));
      // An unreadable photo is a normal outcome — fall through to search
      // rather than leaving the patient on a dead screen.
      setStep(read.lines.length > 0 ? 'cart' : 'choose');
      if (read.lines.length === 0) {
        setMode('search');
        toastError(t('ui.medicine.couldNotRead'), t('ui.medicine.searchAddHint'));
      }
    } catch {
      toastError(t('ui.upload.uploadFailed'), t('ui.common.retry'));
    } finally {
      setReading(false);
    }
  }, [attach.files, t]);

  /* ----------------------------------------------------------------- totals */

  const pricedTotal = lines.reduce(
    (sum, l) => sum + (l.approxPrice ?? 0) * (l.quantity ?? 1),
    0
  );
  const hasUnpriced = lines.some((l) => l.matchStatus !== 'matched');

  /* ----------------------------------------------------------------- submit */

  const submit = async () => {
    if (lines.length === 0 || submitting) return;
    if (delivery === 'home' && address.trim().length < 5) return;
    setSubmitting(true);
    try {
      const fileKeys = attach.files.length
        ? await uploadFiles(attach.files, 'prescription')
        : [];

      const { requestId } = await createRequest({
        type: 'medicine',
        address: delivery === 'home' ? address.trim() : undefined,
        note: note.trim() || undefined,
        lines,
        fileKeys,
        meta: { delivery, neededFor },
      });

      const rows = [
        `${t('ui.medicine.title')}|${lines.length}`,
        `${t('ui.medicine.howDoYouWant')}|${
          delivery === 'home'
            ? t('ui.medicine.homeDelivery')
            : t('ui.medicine.pickUp')
        }`,
        `${t('ui.activity.requests')}|${t('ui.status.pharmacistReviewing')}`,
      ].join('~');

      router.replace({
        pathname: '/services/submitted',
        params: {
          requestId,
          mobile: patient?.phone_number ?? '',
          rows,
        },
      });
    } catch {
      toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------------------------------- render */

  const title =
    step === 'delivery' ? t('ui.medicine.cartTitle') : t('ui.medicine.title');

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        subtitle={step === 'choose' ? undefined : t('ui.medicine.title')}
        onBack={
          step === 'choose'
            ? undefined
            : () => setStep(step === 'delivery' ? 'cart' : 'choose')
        }
      >
        {step === 'choose' ? (
          <View style={styles.hero}>
            <Txt variant="title" color={TEXT.onDark}>
              {t('ui.medicine.heroTitle')}
            </Txt>
            <Txt variant="helperSm" color={TEXT.onDarkMuted} style={styles.heroBody}>
              {t('ui.medicine.heroBody')}
            </Txt>
          </View>
        ) : null}
      </ScreenHeader>

      <Screen contentStyle={step === 'choose' ? undefined : styles.tightTop}>
        {step === 'choose' ? (
          <>
            <View style={styles.modeRow}>
              <ModeTile
                active={mode === 'upload'}
                Icon={Upload}
                title={t('ui.medicine.uploadPrescription')}
                hint={t('ui.medicine.uploadHint')}
                onPress={() => {
                  setMode('upload');
                  attach.openSheet();
                }}
              />
              <ModeTile
                active={mode === 'search'}
                Icon={Search}
                title={t('ui.medicine.searchAdd')}
                hint={t('ui.medicine.searchAddHint')}
                onPress={() => setMode('search')}
              />
            </View>

            {mode === 'upload' ? (
              <View style={styles.block}>
                <UploadField
                  label={t('ui.medicine.uploadPrescription')}
                  hint={t('ui.homeCare.uploadHint')}
                  files={attach.files}
                  onPick={attach.openSheet}
                  onRemove={attach.remove}
                  pickFromRecordsLabel={t('ui.homeCare.pickFromRecords')}
                  onPickFromRecords={() => router.push('/(tabs)/documents')}
                />
                {attach.files.length > 0 ? (
                  <Btn
                    label={t('ui.medicine.weReadIt')}
                    onPress={readUploaded}
                    loading={reading}
                    icon={
                      <Sparkles size={15} color={PALETTE.white} strokeWidth={2.2} />
                    }
                    style={styles.readBtn}
                  />
                ) : null}
              </View>
            ) : null}

            {mode === 'search' ? (
              <View style={styles.block}>
                <Field
                  icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
                  placeholder={t('ui.medicine.searchPlaceholder')}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                <View style={styles.priceNote}>
                  <PriceNote />
                </View>

                {browsing ? (
                  <View style={styles.browseHead}>
                    <Txt variant="section">{t('ui.medicine.commonlyOrdered')}</Txt>
                    <Txt variant="helperSm" color={TEXT.muted}>
                      {t('ui.medicine.commonlyOrderedHint')}
                    </Txt>
                  </View>
                ) : null}

                {searching ? (
                  <SkeletonList count={4} lines={1} />
                ) : results.length === 0 ? (
                  <Txt variant="helperSm" color={TEXT.muted} center>
                    {t('ui.records.empty')}
                  </Txt>
                ) : (
                  results.map((m) => (
                    <MedicineCard
                      key={m.id}
                      medicine={m}
                      inCart={lines.some((l) => l.catalogId === m.id)}
                      onAdd={() => addFromCatalog(m)}
                    />
                  ))
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {step === 'cart' ? (
          <>
            {carefulCheck ? (
              <Card tone="plain" style={styles.warnCard}>
                <AlertTriangle size={15} color="#9A3412" strokeWidth={2.4} />
                <Txt variant="helperSm" color="#9A3412" style={styles.flex}>
                  {t('ui.medicine.weReadItBody', { count: lines.length })}
                </Txt>
              </Card>
            ) : (
              <Card tone="plain" style={styles.aiCard}>
                <Sparkles size={15} color={PALETTE.purple} strokeWidth={2.4} />
                <View style={styles.flex}>
                  <Txt variant="bodyMedium">{t('ui.medicine.weReadIt')}</Txt>
                  <Txt variant="helperSm" color={TEXT.secondary}>
                    {t('ui.medicine.weReadItBody', { count: lines.length })}
                  </Txt>
                </View>
              </Card>
            )}

            {lines.map((l, i) => (
              <CartLine
                key={`${l.name}-${i}`}
                line={l}
                onQuantity={(next) =>
                  setLines((prev) =>
                    prev.map((x, xi) => (xi === i ? { ...x, quantity: next } : x))
                  )
                }
                onRemove={() =>
                  setLines((prev) => prev.filter((_, xi) => xi !== i))
                }
              />
            ))}

            <Pressable
              onPress={() => {
                setMode('search');
                setStep('choose');
              }}
              accessibilityRole="button"
              style={styles.addMore}
            >
              <Txt variant="helper" color={PALETTE.deepBlue} style={styles.link}>
                {t('ui.medicine.searchAddMore')}
              </Txt>
            </Pressable>

            <View style={styles.priceNote}>
              <PriceNote />
            </View>
          </>
        ) : null}

        {step === 'delivery' ? (
          <>
            <Card tone="plain" style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Txt variant="section" style={styles.flex}>
                  {t('ui.medicine.itemCountPlural', { count: lines.length })}
                </Txt>
                <Pressable onPress={() => setStep('cart')} hitSlop={8}>
                  <Txt variant="helper" color={PALETTE.deepBlue} style={styles.link}>
                    {t('ui.medicine.editCart')}
                  </Txt>
                </Pressable>
              </View>

              {lines.map((l, i) => (
                <View key={`${l.name}-${i}`} style={styles.summaryRow}>
                  <Txt
                    variant="bodySm"
                    script="latin"
                    numberOfLines={1}
                    style={styles.flex}
                  >
                    {[l.name, l.strength].filter(Boolean).join(' ')} × {l.quantity ?? 1}
                  </Txt>
                  <ApproxPrice value={l.approxPrice ?? null} />
                </View>
              ))}

              <View style={styles.totalRow}>
                <Txt variant="bodyMedium" style={styles.flex}>
                  {t('ui.medicine.approxTotal')}
                </Txt>
                <ApproxPrice value={pricedTotal > 0 ? pricedTotal : null} />
              </View>

              {hasUnpriced ? (
                <Txt variant="helperSm" color={TEXT.muted}>
                  {t('ui.match.unpriced')}
                </Txt>
              ) : null}
            </Card>

            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.medicine.howDoYouWant')}
            </Txt>
            <View style={styles.chips}>
              <Chip
                label={t('ui.medicine.homeDelivery')}
                selected={delivery === 'home'}
                onPress={() => setDelivery('home')}
              />
              <Chip
                label={t('ui.medicine.pickUp')}
                selected={delivery === 'pickup'}
                onPress={() => setDelivery('pickup')}
              />
            </View>

            {delivery === 'home' ? (
              <Field
                label={t('ui.homeCare.visitAddress')}
                value={address}
                onChangeText={setAddress}
                multiline
                containerStyle={styles.block}
              />
            ) : null}

            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.medicine.neededFor')}
            </Txt>
            <View style={styles.chips}>
              <Chip
                label={t('ui.medicine.sevenDays')}
                selected={neededFor === '7days'}
                onPress={() => setNeededFor('7days')}
              />
              <Chip
                label={t('ui.medicine.asPrescribed')}
                selected={neededFor === 'prescribed'}
                onPress={() => setNeededFor('prescribed')}
              />
              <Chip
                label={t('ui.medicine.someItems')}
                selected={neededFor === 'some'}
                onPress={() => setNeededFor('some')}
              />
            </View>

            <Field
              label={t('ui.medicine.noteForPharmacist')}
              hint={`(${t('ui.common.optional')})`}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t('ui.medicine.notePharmacistPlaceholder')}
              containerStyle={styles.block}
            />

            <Card tone="info" style={styles.nextCard}>
              <Txt variant="helper">{t('ui.medicine.whatHappensNext')}</Txt>
              {[
                t('ui.medicine.next1'),
                t('ui.medicine.next2'),
                t('ui.medicine.next3'),
                t('ui.medicine.next4'),
              ].map((s, i) => (
                <View key={s} style={styles.nextRow}>
                  <View style={styles.nextDot}>
                    <Txt variant="helperSm" color={PALETTE.white} script="latin">
                      {i + 1}
                    </Txt>
                  </View>
                  <Txt variant="helperSm" color={TEXT.secondary} style={styles.flex}>
                    {s}
                  </Txt>
                </View>
              ))}
            </Card>

            <Btn
              label={t('ui.medicine.sendRequest')}
              onPress={submit}
              loading={submitting}
              disabled={
                lines.length === 0 ||
                (delivery === 'home' && address.trim().length < 5)
              }
              style={styles.submit}
            />
          </>
        ) : null}
      </Screen>

      {/* Sticky cart bar, as on F1. */}
      {lines.length > 0 && step !== 'delivery' ? (
        <Pressable
          onPress={() => setStep(step === 'cart' ? 'delivery' : 'cart')}
          accessibilityRole="button"
          style={styles.cartBar}
        >
          <View style={styles.flex}>
            <Txt variant="bodyMedium" color={TEXT.onDark}>
              {t('ui.medicine.itemCountPlural', { count: lines.length })}
            </Txt>
            <Txt variant="helperSm" color={TEXT.onDarkMuted} script="latin">
              {pricedTotal > 0
                ? `₹${pricedTotal.toLocaleString('en-IN')} ${t('ui.common.approx')}`
                : t('ui.medicine.priceOnConfirmation')}
            </Txt>
          </View>
          <Txt variant="button" color={TEXT.onDark}>
            {step === 'cart'
              ? t('ui.medicine.continueToDelivery')
              : t('ui.medicine.viewCart')}
          </Txt>
        </Pressable>
      ) : null}

      <AttachSheet
        visible={attach.sheetOpen}
        onClose={attach.closeSheet}
        onCamera={attach.fromCamera}
        onGallery={attach.fromGallery}
        onDocument={attach.fromDocument}
        onRecords={() => router.push('/(tabs)/documents')}
      />
    </View>
  );
}

/** One of the two big choices on F1. */
function ModeTile({
  active,
  Icon,
  title,
  hint,
  onPress,
}: {
  active: boolean;
  Icon: typeof Upload;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.modeTile,
        active && styles.modeTileOn,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.modeIcon, active && styles.modeIconOn]}>
        <Icon
          size={17}
          color={active ? PALETTE.white : PALETTE.purple}
          strokeWidth={2.2}
        />
      </View>
      <Txt variant="bodyMedium" numberOfLines={2}>
        {title}
      </Txt>
      <Txt variant="helperSm" color={TEXT.muted} numberOfLines={3}>
        {hint}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  flex: {
    flex: 1,
  },
  hero: {
    marginTop: SPACE.md,
  },
  heroBody: {
    marginTop: SPACE.xs,
    maxWidth: 290,
  },
  tightTop: {
    paddingTop: SPACE.md,
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  modeTile: {
    flex: 1,
    borderRadius: RADIUS.cardSm,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    padding: SPACE.sm,
    gap: SPACE.xxs,
    minHeight: 112,
  },
  modeTileOn: {
    borderColor: PALETTE.purple,
    borderWidth: 1.5,
    backgroundColor: SURFACE.tint,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xxs,
  },
  modeIconOn: {
    backgroundColor: PALETTE.purple,
  },
  block: {
    marginTop: SPACE.md,
  },
  readBtn: {
    marginTop: SPACE.md,
  },
  priceNote: {
    marginVertical: SPACE.sm,
  },
  browseHead: {
    gap: 2,
    marginBottom: SPACE.sm,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    backgroundColor: SURFACE.tint,
    borderColor: '#E0D6FF',
    marginBottom: SPACE.md,
  },
  warnCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    backgroundColor: '#FEF3E2',
    borderColor: '#F5D7A8',
    marginBottom: SPACE.md,
  },
  addMore: {
    alignSelf: 'center',
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
  summaryCard: {
    gap: SPACE.xs,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
    paddingTop: SPACE.sm,
    marginTop: SPACE.xxs,
  },
  label: {
    marginTop: SPACE.md,
    marginBottom: SPACE.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
  },
  nextCard: {
    marginTop: SPACE.lg,
    gap: SPACE.xs,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs,
  },
  nextDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.lg,
  },
  cartBar: {
    position: 'absolute',
    left: SPACE.gutter,
    right: SPACE.gutter,
    bottom: SPACE.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: PALETTE.midnight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
    minHeight: 56,
    ...SHADOW.nav,
  },
  pressed: {
    opacity: 0.9,
  },
});

const _icon = Pill;
