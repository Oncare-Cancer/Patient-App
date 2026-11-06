import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Card, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { PALETTE, SPACE, SURFACE, TEXT, TOUCH_MIN } from '@/constants/theme';

export type HospitalUidOption = {
  hospitalUid: string;
  patientName?: string;
  gender?: string;
  age?: string | number;
};

/** "TT" from "Testing Testing" — falls back to the UID when there is no name. */
function initials(name?: string, uid?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (uid ?? '?').slice(0, 2).toUpperCase();
}

function subtitle(o: HospitalUidOption): string {
  // "UID 3130 · Male, 27" — each part dropped when the API did not send it,
  // rather than printing "undefined" or a stray separator.
  const bits = [`UID ${o.hospitalUid}`];
  const person = [o.gender, o.age !== undefined && o.age !== '' ? String(o.age) : null]
    .filter(Boolean)
    .join(', ');
  if (person) bits.push(person);
  return bits.join(' · ');
}

/**
 * Patient picker from screen A2.
 *
 * Shown only when one mobile number is linked to more than one Hospital UID —
 * the case the old app had no answer for. The backend already returns the list
 * from sendOTP; this is the UI that finally uses it.
 */
export function PatientPicker({
  options,
  selected,
  onSelect,
  error,
}: {
  options: HospitalUidOption[];
  selected: string;
  onSelect: (uid: string) => void;
  error?: string;
}) {
  const t = useT();

  return (
    <Card tone="plain" style={styles.card}>
      <Txt variant="helper" color={TEXT.secondary}>
        {t('ui.login.morePatients')}
      </Txt>

      <View style={styles.list}>
        {options.map((o) => {
          const active = o.hospitalUid === selected;
          return (
            <Pressable
              key={o.hospitalUid}
              onPress={() => onSelect(o.hospitalUid)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${o.patientName ?? o.hospitalUid}, ${subtitle(o)}`}
              style={({ pressed }) => [
                styles.row,
                active && styles.rowActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.avatar, active && styles.avatarActive]}>
                <Txt
                  variant="helper"
                  script="latin"
                  color={active ? PALETTE.white : PALETTE.midnight}
                >
                  {initials(o.patientName, o.hospitalUid)}
                </Txt>
              </View>

              <View style={styles.meta}>
                <Txt variant="bodyMedium" numberOfLines={1}>
                  {o.patientName ?? `UID ${o.hospitalUid}`}
                </Txt>
                {/* UID, gender and age are record data — kept Latin so the row
                    does not switch script mid-list in Hindi. */}
                <Txt variant="helperSm" color={TEXT.muted} script="latin" numberOfLines={1}>
                  {subtitle(o)}
                </Txt>
              </View>

              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Txt variant="helperSm" color={PALETTE.sosRed}>
          {error}
        </Txt>
      ) : (
        <Txt variant="helperSm" color={TEXT.muted}>
          {t('ui.login.patientPickerHint')}
        </Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACE.sm,
  },
  list: {
    gap: SPACE.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN + 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  rowActive: {
    borderColor: PALETTE.purple,
    borderWidth: 1.5,
    backgroundColor: SURFACE.tint,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: PALETTE.purple,
  },
  meta: {
    flex: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: PALETTE.purple,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: PALETTE.purple,
  },
  pressed: {
    opacity: 0.85,
  },
});
