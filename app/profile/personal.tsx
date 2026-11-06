import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Screen, ScreenHeader, Txt } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * Personal details, read-only.
 *
 * Read-only deliberately: these fields come from the hospital's patient record
 * in Docpulse, and the mobile API exposes no write path. Letting a patient edit
 * a name or date of birth here would either silently discard the change or
 * desynchronise the app from the record the centre actually treats them on.
 *
 * Section 10 lists "Personal details · DOB, Govt ID, address" without an edit
 * action, which matches.
 */
export default function PersonalDetails() {
  const t = useT();
  const { patient } = useAuth();

  const rows: { label: string; value?: string }[] = [
    { label: t('ui.personal.name'), value: patient?.patient_name },
    { label: t('ui.home.hospitalId'), value: patient?.patient_id },
    { label: t('ui.personal.mobile'), value: patient?.phone_number ? `+91 ${patient.phone_number}` : undefined },
    { label: t('ui.personal.gender'), value: patient?.gender },
    { label: t('ui.personal.age'), value: patient?.age_yrs },
    { label: t('ui.personal.dob'), value: patient?.date_of_birth },
    { label: t('ui.personal.address'), value: patient?.address },
    { label: t('ui.personal.area'), value: patient?.area },
    { label: t('ui.personal.city'), value: patient?.city },
    { label: t('ui.personal.state'), value: patient?.state },
    { label: t('ui.personal.registeredAt'), value: patient?.registeration_center },
  ].filter((r) => r.value !== undefined && r.value !== null && r.value !== '');

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.profile.personalDetails')} />

      <Screen>
        <Card tone="plain" padded={false} style={styles.card}>
          {rows.map((r, i) => (
            <View
              key={r.label}
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <Txt variant="helperSm" color={TEXT.muted} style={styles.label}>
                {r.label}
              </Txt>
              {/* Record data — kept Latin so it reads the same as on the
                  hospital's own paperwork. */}
              <Txt
                variant="bodyMedium"
                script="latin"
                style={styles.value}
                numberOfLines={3}
              >
                {r.value}
              </Txt>
            </View>
          ))}
        </Card>

        <Txt variant="helperSm" color={TEXT.muted} style={styles.note}>
          {t('ui.personal.changeNote')}
        </Txt>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  card: { paddingHorizontal: SPACE.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  label: { width: 104 },
  value: { flex: 1, textAlign: 'right' },
  note: { marginTop: SPACE.md, marginBottom: SPACE.lg },
});
