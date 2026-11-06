import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Btn, Card, Chip, SkeletonList, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  bandOf,
  isTaken,
  slotLabel,
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
 * C3 — visit type, date and slot.
 *
 * Visit types come from Docpulse (`visit-types` per location + practitioner) and
 * are rendered as returned, so whatever the clinic configures is what shows.
 *
 * Two of the PDF's listed bugs are fixed here:
 *
 *  - Issue #11, booked slots were bookable. A taken slot is now greyed, struck
 *    through and not pressable. The old screen let a patient pick one and only
 *    told them after submitting.
 *  - Issue #4, the date picker was a native modal unsupported on web. This is a
 *    horizontal date strip, which works on all three platforms and is what the
 *    design shows anyway.
 *
 * There is no "At centre / Video call" switch: Docpulse has no mode parameter,
 * so the choice could not reach the booking. If video consultations are set up
 * they arrive as their own visit type.
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
  dates,
  date,
  onDate,
  slots,
  loadingSlots,
  selectedSlot,
  onSlot,
}: {
  visitTypes: string[];
  visitType: string | null;
  onVisitType: (v: string) => void;
  dates: Date[];
  date: Date;
  onDate: (d: Date) => void;
  slots: BookingSlot[];
  loadingSlots: boolean;
  selectedSlot: string | null;
  onSlot: (dateTime: string) => void;
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

      {!visitType ? (
        // Slots are fetched per visit type, so an empty list before one is
        // chosen is not "no availability" — saying so would be wrong.
        <Card tone="info" style={styles.noSlots}>
          <Txt variant="bodySm" color={TEXT.secondary} center>
            {t('ui.booking.selectVisitTypeFirst')}
          </Txt>
        </Card>
      ) : loadingSlots ? (
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
                    // Docpulse's own formatted time, not a local reformat.
                    label={slotLabel(s)}
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

      {/*
        No Continue button here.

        A full day of 15-minute slots is a very long list, so a button at the
        end of it sat far below the fold and under the floating nav — after
        picking a time there was no visible way forward. The parent renders it
        as a sticky bar pinned above the nav instead.
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: SPACE.sm },
  sectionTop: { marginTop: SPACE.md, marginBottom: SPACE.xs },
  typeRow: { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'wrap' },
  typeWrap: { flexGrow: 1, flexBasis: '46%' },
  typeCard: { gap: 2, minHeight: 64 },
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
  pressed: { opacity: 0.9 },
});

const _touch = TOUCH_MIN;
