import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, SkeletonList, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import {
  getSlots,
  rescheduleAppointment,
  formatWhen,
  type Appointment,
  type Slot,
} from '@/services/appointments';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
} from '@/constants/theme';

/**
 * Reschedule, as a sheet over Activity.
 *
 * Slots are grouped into morning / afternoon / evening the way the design does
 * it, and a slot already taken is greyed and struck through rather than hidden —
 * issue #11. The previous build rendered booked slots as tappable, so a patient
 * could pick one and only find out it was gone after submitting.
 */

type Band = 'morning' | 'afternoon' | 'evening';

function bandOf(iso: string): Band {
  const h = new Date(iso).getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Next 7 days, starting today. */
function dateStrip(): Date[] {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function RescheduleSheet({
  appointment,
  onClose,
  onDone,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (appt: Appointment, when: Date) => {
      setLoading(true);
      setSelected(null);
      try {
        const list = await getSlots(appt, when);
        setSlots(list);
        // Preselect the slot the appointment is already on, as before.
        const existing = list.find((s) => s.dateTime === appt.dateTime);
        if (existing) setSelected(existing.dateTime);
      } catch {
        setSlots([]);
        toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!appointment) return;
    const today = new Date();
    setDate(today);
    void load(appointment, today);
  }, [appointment, load]);

  const submit = async () => {
    if (!appointment || !selected || submitting) return;
    setSubmitting(true);
    try {
      await rescheduleAppointment(appointment, selected);
      toastSuccess(t('ui.activity.rescheduled'), formatWhen(selected));
      onDone();
    } catch (e: any) {
      toastError(e?.message ?? t('ui.common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  const bands: Band[] = ['morning', 'afternoon', 'evening'];

  return (
    <Modal
      visible={appointment !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={t('ui.common.cancel')}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.md }]}>
        <View style={styles.grabber} />
        <Txt variant="title">{t('ui.activity.reschedule')}</Txt>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dates}
        >
          {dateStrip().map((d) => {
            const on = d.toDateString() === date.toDateString();
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => {
                  setDate(d);
                  if (appointment) void load(appointment, d);
                }}
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

        <ScrollView style={styles.slotScroll} showsVerticalScrollIndicator={false}>
          {loading ? (
            <SkeletonList count={2} lines={1} />
          ) : slots.length === 0 ? (
            <Txt variant="bodySm" color={TEXT.muted} center style={styles.noSlots}>
              {t('ui.activity.noSlots')}
            </Txt>
          ) : (
            bands.map((band) => {
              const inBand = slots.filter((s) => bandOf(s.dateTime) === band);
              if (inBand.length === 0) return null;
              return (
                <View key={band} style={styles.band}>
                  <Txt variant="helper" color={TEXT.secondary}>
                    {t(`ui.booking.${band}` as never)}
                  </Txt>
                  <View style={styles.slotGrid}>
                    {inBand.map((s) => {
                      // Anything the API marks unavailable is shown greyed and
                      // struck through, not hidden — issue #11.
                      const taken = (s as any).isBooked === true ||
                        (s as any).available === false;
                      return (
                        <Chip
                          key={s.dateTime}
                          label={timeLabel(s.dateTime)}
                          latin
                          shape="box"
                          disabled={taken}
                          selected={selected === s.dateTime}
                          onPress={() => setSelected(s.dateTime)}
                          style={styles.slot}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <Txt variant="helperSm" color={TEXT.muted} style={styles.greyNote}>
          {t('ui.booking.greyedNote')}
        </Txt>

        <Btn
          label={t('ui.activity.reschedule')}
          onPress={submit}
          loading={submitting}
          disabled={!selected}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,45,0.55)' },
  sheet: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.sm,
    maxHeight: '86%',
    ...SHADOW.nav,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: SURFACE.border,
    marginBottom: SPACE.sm,
  },
  dates: { gap: SPACE.xs, paddingVertical: SPACE.md },
  dateChip: {
    width: 52,
    paddingVertical: SPACE.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE.border,
    alignItems: 'center',
  },
  dateChipOn: { backgroundColor: PALETTE.purple, borderColor: PALETTE.purple },
  slotScroll: { flexGrow: 0, maxHeight: 280 },
  band: { gap: SPACE.xs, marginBottom: SPACE.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  slot: { minWidth: 72 },
  noSlots: { paddingVertical: SPACE.xl },
  greyNote: { marginVertical: SPACE.sm },
});
