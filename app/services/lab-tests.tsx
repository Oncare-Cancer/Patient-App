import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  Check,
  FlaskConical,
  MapPin,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react-native';
import {
  ApproxPrice,
  AttachSheet,
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
import { useAttachments } from '@/hooks/useAttachments';
import { useDebounced } from '@/hooks/useDebounced';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { searchLabTests, type LabTest } from '@/services/catalog';
import { createRequest, type RequestLine } from '@/services/requests';
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
 * G1-G3 — Lab tests.
 *
 * Same single-screen shape as the medicine flow, for the same reason: the
 * selected tests are one list that all three steps share.
 *
 * Pincode is collected up front because it decides the price. The same KFT is
 * ₹500 from a Delhi partner and ₹760 from a Bangalore one, so a single national
 * number would be wrong for roughly half the patients.
 */

type Step = 'choose' | 'review' | 'schedule';
type Slot = '7-10' | '10-13' | '16-19';

export default function LabTests() {
  const t = useT();
  const router = useRouter();
  const { patient } = useAuth();
  // B6: a guest who browsed lab prices arrives here after login. The price
  // list selects nothing, so the pincode is the only thing worth restoring —
  // it is what they would otherwise have to type again.
  const resume = useLocalSearchParams<{ resumePincode?: string }>();

  const [step, setStep] = useState<Step>('choose');
  const [mode, setMode] = useState<'upload' | 'select' | null>(
    resume.resumePincode ? 'select' : null
  );
  const [pincode, setPincode] = useState(resume.resumePincode ?? '');
  const [lines, setLines] = useState<RequestLine[]>([]);
  const [reading, setReading] = useState(false);
  const [carefulCheck, setCarefulCheck] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>('popular');
  const [results, setResults] = useState<LabTest[]>([]);
  const [searching, setSearching] = useState(false);

  const [address, setAddress] = useState('');
  const [dateChoice, setDateChoice] = useState<'today' | 'tomorrow'>('tomorrow');
  const [slot, setSlot] = useState<Slot>('7-10');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const attach = useAttachments();
  const debouncedSearch = useDebounced(search, 350);
  const debouncedPin = useDebounced(pincode, 500);

  const categories = useMemo(
    () => [
      { key: 'popular', label: t('ui.lab.popular') },
      { key: 'tumour', label: t('ui.lab.tumourMarkers') },
      { key: 'blood', label: t('ui.lab.blood') },
      { key: 'liverKidney', label: t('ui.lab.liverKidney') },
    ],
    [t]
  );

  const slots: { key: Slot; label: string }[] = [
    { key: '7-10', label: '7-10 AM' },
    { key: '10-13', label: '10 AM-1 PM' },
    { key: '16-19', label: '4-7 PM' },
  ];

  /* ------------------------------------------------------------- catalogue */

  useEffect(() => {
    if (mode !== 'select') return;
    setSearching(true);
    searchLabTests({
      search: debouncedSearch || undefined,
      category: debouncedSearch ? undefined : category,
      pincode: debouncedPin.length === 6 ? debouncedPin : undefined,
      limit: 20,
    })
      .then((page) => setResults(page.list))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [mode, debouncedSearch, category, debouncedPin]);

  const toggleTest = (test: LabTest) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.catalogId === test.id);
      if (at >= 0) return prev.filter((_, i) => i !== at);
      return [
        ...prev,
        {
          name: test.displayName,
          catalogId: test.id,
          quantity: 1,
          matchStatus: test.price === null ? 'unpriced' : 'matched',
          approxPrice: test.price,
        },
      ];
    });
  };

  const isSelected = (id: string) => lines.some((l) => l.catalogId === id);

  /* ----------------------------------------------------- read prescription */

  const readUploaded = useCallback(async () => {
    if (attach.files.length === 0) return;
    setReading(true);
    try {
      const fileKeys = await uploadFiles(attach.files, 'prescription');
      const read = await readPrescription({ fileKeys, want: 'labTests' });
      setLines(read.lines);
      setCarefulCheck(needsCarefulCheck(read));
      if (read.lines.length > 0) {
        setStep('review');
      } else {
        setMode('select');
        toastError(t('ui.medicine.couldNotRead'), t('ui.lab.selectTestsHint'));
      }
    } catch {
      toastError(t('ui.upload.uploadFailed'), t('ui.common.retry'));
    } finally {
      setReading(false);
    }
  }, [attach.files, t]);

  /* ----------------------------------------------------------------- totals */

  const pricedTotal = lines.reduce((sum, l) => sum + (l.approxPrice ?? 0), 0);

  /* ----------------------------------------------------------------- submit */

  const submit = async () => {
    if (lines.length === 0 || submitting || address.trim().length < 5) return;
    setSubmitting(true);
    try {
      const fileKeys = attach.files.length
        ? await uploadFiles(attach.files, 'prescription')
        : [];

      const d = new Date();
      if (dateChoice === 'tomorrow') d.setDate(d.getDate() + 1);

      const { requestId } = await createRequest({
        type: 'lab',
        address: address.trim(),
        pincode: pincode || undefined,
        preferredDate: d.toISOString().slice(0, 10),
        preferredSlot: slot,
        note: note.trim() || undefined,
        lines,
        fileKeys,
      });

      const rows = [
        `${t('ui.lab.title')}|${lines.length}`,
        `${t('ui.homeCare.preferredDate')}|${d.toISOString().slice(0, 10)}`,
        `${t('ui.homeCare.preferredTime')}|${
          slots.find((s) => s.key === slot)?.label ?? ''
        }`,
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
    step === 'schedule'
      ? t('ui.lab.bookCollection')
      : step === 'review'
      ? t('ui.lab.testsFromPrescription')
      : t('ui.lab.title');

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        subtitle={step === 'choose' ? undefined : t('ui.lab.title')}
        onBack={
          step === 'choose'
            ? undefined
            : () => setStep(step === 'schedule' ? 'review' : 'choose')
        }
        actions={
          step === 'choose' ? (
            <View style={styles.pinChip}>
              <MapPin size={11} color={PALETTE.white} strokeWidth={2.4} />
              <Txt variant="helperSm" color={PALETTE.white} script="latin">
                {debouncedPin.length === 6 ? debouncedPin : '—'}
              </Txt>
            </View>
          ) : undefined
        }
      />

      <Screen contentStyle={styles.tightTop}>
        {step === 'choose' ? (
          <>
            <Field
              icon={<MapPin size={15} color={TEXT.muted} strokeWidth={2} />}
              label="Pincode"
              hint={t('ui.lab.pincodeHint')}
              placeholder="122001"
              value={pincode}
              onChangeText={(v) => setPincode(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              containerStyle={styles.block}
            />

            <View style={styles.modeRow}>
              <ModeTile
                active={mode === 'upload'}
                Icon={Upload}
                title={t('ui.lab.uploadPrescription')}
                hint={t('ui.lab.uploadHint')}
                onPress={() => {
                  setMode('upload');
                  attach.openSheet();
                }}
              />
              <ModeTile
                active={mode === 'select'}
                Icon={FlaskConical}
                title={t('ui.lab.selectTests')}
                hint={t('ui.lab.selectTestsHint')}
                onPress={() => setMode('select')}
              />
            </View>

            {mode === 'upload' ? (
              <View style={styles.block}>
                <UploadField
                  label={t('ui.lab.uploadPrescription')}
                  hint={t('ui.homeCare.uploadHint')}
                  files={attach.files}
                  onPick={attach.openSheet}
                  onRemove={attach.remove}
                  pickFromRecordsLabel={t('ui.homeCare.pickFromRecords')}
                  onPickFromRecords={() => router.push('/(tabs)/documents')}
                />
                {attach.files.length > 0 ? (
                  <Btn
                    label={t('ui.lab.uploadHint')}
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

            {mode === 'select' ? (
              <View style={styles.block}>
                <Field
                  icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
                  placeholder={t('ui.lab.searchPlaceholder')}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />

                <View style={styles.chipsRow}>
                  {categories.map((c) => (
                    <Chip
                      key={c.key}
                      label={c.label}
                      latin
                      selected={!search && category === c.key}
                      onPress={() => {
                        setSearch('');
                        setCategory(category === c.key ? undefined : c.key);
                      }}
                    />
                  ))}
                </View>

                <View style={styles.priceNote}>
                  <PriceNote />
                </View>

                {searching ? (
                  <SkeletonList count={5} lines={1} />
                ) : (
                  results.map((test) => {
                    const on = isSelected(test.id);
                    return (
                      <Pressable
                        key={test.id}
                        onPress={() => toggleTest(test)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        style={({ pressed }) => [pressed && styles.pressed]}
                      >
                        <Card tone="plain" selected={on} style={styles.testRow}>
                          <View style={[styles.check, on && styles.checkOn]}>
                            {on ? (
                              <Check size={12} color={PALETTE.white} strokeWidth={3} />
                            ) : null}
                          </View>
                          <View style={styles.flex}>
                            <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
                              {test.displayName}
                            </Txt>
                            <View style={styles.testSub}>
                              {test.tat ? (
                                <Txt variant="helperSm" color={TEXT.muted}>
                                  {t('ui.lab.reportIn', { time: test.tat })}
                                </Txt>
                              ) : null}
                              {test.homeCollection ? (
                                <View style={styles.homeTag}>
                                  <Txt variant="helperSm" color="#1B7A42">
                                    {t('ui.lab.homeCollection')}
                                  </Txt>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          <ApproxPrice value={test.price} />
                        </Card>
                      </Pressable>
                    );
                  })
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {step === 'review' ? (
          <>
            {carefulCheck ? (
              <Card tone="plain" style={styles.warnCard}>
                <AlertTriangle size={15} color="#9A3412" strokeWidth={2.4} />
                <Txt variant="helperSm" color="#9A3412" style={styles.flex}>
                  {t('ui.lab.weFoundBody')}
                </Txt>
              </Card>
            ) : (
              <Card tone="plain" style={styles.aiCard}>
                <Sparkles size={15} color={PALETTE.purple} strokeWidth={2.4} />
                <View style={styles.flex}>
                  <Txt variant="bodyMedium">
                    {t('ui.lab.weFound', { count: lines.length })}
                  </Txt>
                  <Txt variant="helperSm" color={TEXT.secondary}>
                    {t('ui.lab.weFoundBody')}
                  </Txt>
                </View>
              </Card>
            )}

            {lines.map((l, i) => (
              <CartLine
                key={`${l.name}-${i}`}
                line={l}
                showQuantity={false}
                onRemove={() => setLines((prev) => prev.filter((_, x) => x !== i))}
              />
            ))}

            <Pressable
              onPress={() => {
                setMode('select');
                setStep('choose');
              }}
              accessibilityRole="button"
              style={styles.addMore}
            >
              <Txt variant="helper" color={PALETTE.deepBlue} style={styles.link}>
                {t('ui.lab.missingTest')} {t('ui.lab.searchAdd')}
              </Txt>
            </Pressable>

            <View style={styles.priceNote}>
              <PriceNote />
            </View>
          </>
        ) : null}

        {step === 'schedule' ? (
          <>
            <Card tone="plain" style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Txt variant="section" style={styles.flex}>
                  {t('ui.lab.testsSelected', { count: lines.length })}
                </Txt>
                <Pressable onPress={() => setStep('review')} hitSlop={8}>
                  <Txt variant="helper" color={PALETTE.deepBlue} style={styles.link}>
                    {t('ui.common.edit')}
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
                    {l.name}
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
            </Card>

            <Field
              label={t('ui.lab.collectionAddress')}
              value={address}
              onChangeText={setAddress}
              multiline
              containerStyle={styles.block}
            />

            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.homeCare.preferredDate')}
            </Txt>
            <View style={styles.chipsRow}>
              <Chip
                label={t('ui.homeCare.today')}
                selected={dateChoice === 'today'}
                onPress={() => setDateChoice('today')}
              />
              <Chip
                label={t('ui.homeCare.tomorrow')}
                selected={dateChoice === 'tomorrow'}
                onPress={() => setDateChoice('tomorrow')}
              />
            </View>

            <Txt variant="helper" color={TEXT.secondary} style={styles.label}>
              {t('ui.homeCare.preferredTime')}
            </Txt>
            <View style={styles.chipsRow}>
              {slots.map((s) => (
                <Chip
                  key={s.key}
                  label={s.label}
                  latin
                  selected={slot === s.key}
                  onPress={() => setSlot(s.key)}
                />
              ))}
            </View>

            <Field
              label={t('ui.homeCare.noteForTeam')}
              hint={`(${t('ui.common.optional')})`}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t('ui.lab.notePlaceholder')}
              containerStyle={styles.block}
            />

            <Btn
              label={t('ui.lab.submitRequest')}
              onPress={submit}
              loading={submitting}
              disabled={lines.length === 0 || address.trim().length < 5}
              style={styles.submit}
            />

            <Txt variant="helperSm" color={TEXT.muted} center style={styles.footnote}>
              {t('ui.lab.confirmNote')}
            </Txt>
          </>
        ) : null}
      </Screen>

      {lines.length > 0 && step !== 'schedule' ? (
        <Pressable
          onPress={() => setStep(step === 'review' ? 'schedule' : 'review')}
          accessibilityRole="button"
          style={styles.cartBar}
        >
          <View style={styles.flex}>
            <Txt variant="bodyMedium" color={TEXT.onDark}>
              {t('ui.lab.testsSelected', { count: lines.length })}
            </Txt>
            <Txt variant="helperSm" color={TEXT.onDarkMuted} script="latin">
              {pricedTotal > 0
                ? `₹${pricedTotal.toLocaleString('en-IN')} ${t('ui.common.approx')}`
                : t('ui.medicine.priceOnConfirmation')}
            </Txt>
          </View>
          <Txt variant="button" color={TEXT.onDark}>
            {t('ui.common.continue')}
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
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  tightTop: { paddingTop: SPACE.md },
  block: { marginTop: SPACE.md },
  modeRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
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
  modeIconOn: { backgroundColor: PALETTE.purple },
  readBtn: { marginTop: SPACE.md },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
  },
  priceNote: { marginVertical: SPACE.sm },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: PALETTE.purple, borderColor: PALETTE.purple },
  testSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  homeTag: {
    backgroundColor: '#EAF8EF',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
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
  link: { textDecorationLine: 'underline' },
  summaryCard: { gap: SPACE.xs },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
    paddingTop: SPACE.sm,
    marginTop: SPACE.xxs,
  },
  label: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  submit: { marginTop: SPACE.lg },
  footnote: { marginTop: SPACE.sm, marginBottom: SPACE.lg },
  pinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
  pressed: { opacity: 0.9 },
});
