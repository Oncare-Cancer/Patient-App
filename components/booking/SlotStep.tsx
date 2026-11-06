import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Building2, Video } from 'lucide-react-native';
import { Btn, Card, Chip, SkeletonList, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  bandOf,
  isTaken,
  slotTime,
  type BookingSlot,
  type SlotBand,
} from '@/services/booking';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';
import type { StringKey } from '@/constants/i18n';

/**
 * C3 — visit type, mode, date and slot.
 *
 * Two of the PDF's listed bugs are fixed here:
 *
 *  - Issue #11, booked slots were bookable. A taken slot is now greyed, struck
 *    through and not pressable. The old screen let a patient pick one and only
 *    told them after submitting.
 *  - Issue #4, the date picker was a native modal unsupported on web. This is a
 *    horizontal date strip, which works identically on all three platforms and
 *    is what the design shows anyway.
 *
 * Video consultation is a new option from section 07. It is sent as part of the
 * visit type the API already accepts, so no new endpoint is involved — see the
 * note in the parent where `visitTypeName` is assembled.
 */

const BAND_LABEL: Record<SlotBand, StringKey> = {
  morning: 'ui.booking.morning',
  afternoon: 'ui.booking.afternoon',
  evening: 'ui.booking.evening',
};

export function SlotStep({
  visitTypes,
  visitType,
  onVisitType,
  mode,
  onMode,
  dates,
  date,
  onDate,
  slots,
  loadingSlots,
  selectedSlot,
  onSlot,
  onReview,
}: {
  visitTypes: string[];
  visitType: string | null;
  onVisitType: (v: string) => void;
  mode: 'centre' | 'video';
  onMode: (m: 'centre' | 'video') => void;
  dates: Date[];
  date: Date;
  onDate: (d: Date) => void;
  slots: BookingSlot[];
  loadingSlots: boolean;
  selectedSlot: string | null;
  onSlot: (dateTime: string) => void;
  onReview: () => void;
}) {
  const t = useT();
  const bands: SlotBand[] = ['morning', 'afternoon', 'evening'];
  const anyTaken = slots.some(isTaken);

  return (
    <View>
      <Txt variant="section" style={styles.title}>
        {t('ui.booking.typeOfVisit')}
      </Txt>

      {/* The API's visit types are the source of truth; the design's
          "First consultation / Follow-up" pair is how they usually come back,
          but the list is rendered from whatever it actually returns. */}
      <View style={styles.typeRow}>
        {visitTypes.map((v) => {
          const active = visitType === v;
          const isFirst = /first|new/i.test(v);
          return (
            <Pressable
              key={v}
              onPress={() => onVisitType(v)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.typeWrap, pressed && styles.pressed]}
            >
              <Card tone="plain" selected={active} style={styles.typeCard}>
                <Txt variant="bodyMedium" script="latin" numberOfLines={2}>
                  {v}
                </Txt>
                <Txt variant="helperSm" color={TEXT.muted}>
                  {isFirst
                    ? t('ui.booking.firstConsultationHint')
                    : t('ui.booking.followUpHint')}
                </Txt>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.modeRow}>
        <Chip
          label={t('ui.booking.atCentre')}
          selected={mode === 'centre'}
          onPress={() => onMode('centre')}
        />
        <Chip
          label={t('ui.booking.videoCall')}
          selected={mode === 'video'}
          onPress={() => onMode('video')}
        />
      </View>

      <Txt variant="section" style={styles.sectionTop}>
        {t('ui.booking.pickDate')}
      </Txt>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dates}
      >
        {dates.map((d) => {
          const on = d.toDateString() === date.toDateString();
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => onDate(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.dateChip, on && styles.dateChipOn]}
            >
              <Txt
                variant="helperSm"
                script="latin"
                color={on ? PALETTE.white : TEXT.muted}
              >
                {d.toLocaleDateString('en-IN', { weekday: 'short' })}
              </Txt>
              <Txt
                variant="bodyMedium"
                script="latin"
                color={on ? PALETTE.white : TEXT.primary}
              >
                {d.getDate()}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {loadingSlots ? (
        <SkeletonList count={2} lines={1} />
      ) : slots.length === 0 ? (
        <Card tone="info" style={styles.noSlots}>
          <Txt variant="bodySm" color={TEXT.secondary} center>
            {t('ui.activity.noSlots')}
          </Txt>
        </Card>
      ) : (
        bands.map((band) => {
          const inBand = slots.filter((s) => bandOf(s.dateTime) === band);
          if (inBand.length === 0) return null;
          return (
            <View key={band} style={styles.band}>
              <Txt variant="helper" color={TEXT.secondary}>
                {t(BAND_LABEL[band])}
              </Txt>
              <View style={styles.slotGrid}>
                {inBand.map((s) => (
                  <Chip
                    key={s.dateTime}
                    label={slotTime(s.dateTime)}
                    latin
                    shape="box"
                    // Greyed, struck through and not pressable — issue #11.
                    disabled={isTaken(s)}
                    selected={selectedSlot === s.dateTime}
                    onPress={() => onSlot(s.dateTime)}
                    style={styles.slot}
                  />
                ))}
              </View>
            </View>
          );
        })
      )}

      {anyTaken ? (
        <Txt variant="helperSm" color={TEXT.muted} style={styles.greyNote}>
          {t('ui.booking.greyedNote')}
        </Txt>
      ) : null}

      <Btn
        label={t('ui.booking.reviewBooking')}
        onPress={onReview}
        disabled={!visitType || !selectedSlot}
        style={styles.continue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: SPACE.sm },
  sectionTop: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  typeRow: { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'wrap' },
  typeWrap: { flexGrow: 1, flexBasis: '46%' },
  typeCard: { gap: 2, minHeight: 64 },
  modeRow: { flexDirection: 'row', gap: SPACE.xs, marginTop: SPACE.sm },
  dates: { gap: SPACE.xs, paddingVertical: SPACE.sm },
  dateChip: {
    width: 52,
    paddingVertical: SPACE.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
  },
  dateChipOn: { backgroundColor: PALETTE.purple, borderColor: PALETTE.purple },
  band: { gap: SPACE.xs, marginBottom: SPACE.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  slot: { minWidth: 72 },
  noSlots: { paddingVertical: SPACE.lg },
  greyNote: { marginBottom: SPACE.sm },
  continue: { marginTop: SPACE.md, marginBottom: SPACE.lg },
  pressed: { opacity: 0.9 },
});

const _icons = { Building2, Video };
const _touch = TOUCH_MIN;
