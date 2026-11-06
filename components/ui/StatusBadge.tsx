import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Txt } from './Txt';
import { RADIUS, SPACE, STATUS } from '@/constants/theme';

/**
 * Status colours are fixed by section 03's rules:
 *   green = done · violet = in progress · amber = action needed · red = cancelled
 *
 * Mapping every backend status onto those four here — rather than at each call
 * site — is what keeps an "Estimate shared" badge the same colour in Activity,
 * on the Home next-step card and in a request timeline.
 */
export type StatusTone = 'done' | 'inProgress' | 'actionNeeded' | 'cancelled';

const TONE_FOR: Record<string, StatusTone> = {
  // done
  completed: 'done',
  confirmed: 'done',
  delivered: 'done',
  samplecollected: 'done',
  admitted: 'done',
  scheduled: 'done',
  readyforpickup: 'done',

  // in progress
  submitted: 'inProgress',
  called: 'inProgress',
  inprogress: 'inProgress',
  pharmacistreviewing: 'inProgress',
  doctorreviewing: 'inProgress',
  preauth: 'inProgress',

  // action needed — the patient has to do something
  priceshared: 'actionNeeded',
  confirmprice: 'actionNeeded',
  estimateshared: 'actionNeeded',
  pending: 'actionNeeded',

  // cancelled / closed
  cancelled: 'cancelled',
  closed: 'cancelled',
  rejected: 'cancelled',
};

const FILL: Record<StatusTone, string> = {
  done: '#E7F6EC',
  inProgress: '#F1E9FF',
  actionNeeded: '#FEF3E2',
  cancelled: '#FDE8E8',
};

export function toneForStatus(status: string): StatusTone {
  return TONE_FOR[status.toLowerCase().replace(/[^a-z]/g, '')] ?? 'inProgress';
}

export function StatusBadge({
  label,
  status,
  tone,
}: {
  label: string;
  /** Raw backend status; ignored when `tone` is given. */
  status?: string;
  tone?: StatusTone;
}) {
  const resolved = tone ?? (status ? toneForStatus(status) : 'inProgress');

  return (
    <View style={[styles.badge, { backgroundColor: FILL[resolved] }]}>
      <Txt variant="helperSm" color={STATUS[resolved]} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
