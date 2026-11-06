import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Btn, StatusBadge, Timeline, Txt } from '@/components/ui';
import type { TimelineStep } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import type { OpsRequest, RequestStatus } from '@/services/requests';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';
import type { StringKey } from '@/constants/i18n';

/**
 * H3 — one request with its live status timeline.
 *
 * The ladder is the same for every request type (section 17), so the steps are
 * derived from the status rather than stored per type. Future steps stay visible
 * and greyed: for a patient waiting on a price call, seeing what comes next is
 * the point.
 */

/** Section 17's shared status ladder, in order. */
const LADDER: RequestStatus[] = [
  'submitted',
  'called',
  'scheduled',
  'priceShared',
  'inProgress',
  'completed',
];

const STATUS_LABEL: Record<RequestStatus, StringKey> = {
  submitted: 'ui.status.submitted',
  called: 'ui.status.called',
  scheduled: 'ui.status.scheduled',
  priceShared: 'ui.status.priceShared',
  inProgress: 'ui.status.inProgress',
  completed: 'ui.status.completed',
  closed: 'ui.status.closed',
};

const TYPE_LABEL: Record<string, StringKey> = {
  homeCare: 'ui.home.homeCare',
  medicine: 'ui.home.orderMedicines',
  lab: 'ui.home.labTestAtHome',
  secondOpinion: 'ui.home.secondOpinion',
  admission: 'ui.home.admissionDaycare',
  callBack: 'ui.guest.callBackTitle',
};

function stepsFor(req: OpsRequest, t: (k: StringKey) => string): TimelineStep[] {
  // A closed request stops wherever it stopped — showing the rest of the
  // ladder greyed would imply it is still moving.
  if (req.status === 'closed') {
    return req.timeline.map((e, i) => ({
      label: t(STATUS_LABEL[e.status]),
      at: e.at,
      done: true,
      current: i === req.timeline.length - 1,
    }));
  }

  const reachedAt = new Map(req.timeline.map((e) => [e.status, e.at]));
  const currentIndex = LADDER.indexOf(req.status);

  return LADDER.map((status, i) => ({
    label: t(STATUS_LABEL[status]),
    at: reachedAt.get(status),
    done: i < currentIndex,
    current: i === currentIndex,
  }));
}

export function RequestCard({
  request,
  onConfirmPrice,
  onCall,
  confirming,
}: {
  request: OpsRequest;
  /** Shown only when Ops has shared a price the patient must accept. */
  onConfirmPrice?: () => void;
  onCall: () => void;
  confirming?: boolean;
}) {
  const t = useT();
  const steps = stepsFor(request, t as (k: StringKey) => string);
  const awaitingPrice = request.status === 'priceShared';

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Txt variant="bodyMedium">
            {t(TYPE_LABEL[request.type] ?? 'ui.activity.requests')}
          </Txt>
          <Txt variant="helperSm" color={TEXT.muted} script="latin">
            {request.requestId}
            {request.subType ? ` · ${request.subType}` : ''}
          </Txt>
        </View>
        <StatusBadge
          label={t(STATUS_LABEL[request.status])}
          status={request.status}
        />
      </View>

      <View style={styles.timeline}>
        <Timeline steps={steps} />
      </View>

      {awaitingPrice && request.quotedTotal ? (
        <View style={styles.quoteRow}>
          <Txt variant="helperSm" color={TEXT.muted} style={styles.flex}>
            {t('ui.medicine.approxTotal')}
          </Txt>
          <Txt variant="section" script="latin">
            ₹{request.quotedTotal.toLocaleString('en-IN')}
          </Txt>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Btn
          label={t('ui.activity.callCareTeam')}
          variant="secondary"
          compact
          block={false}
          onPress={onCall}
          style={styles.action}
        />
        {awaitingPrice && onConfirmPrice ? (
          <Btn
            label={t('ui.activity.confirmPrice')}
            compact
            block={false}
            loading={confirming}
            onPress={onConfirmPrice}
            style={styles.action}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACE.sm, gap: SPACE.sm },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  timeline: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
    paddingTop: SPACE.sm,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: SURFACE.tint,
    borderRadius: 10,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  actions: { flexDirection: 'row', gap: SPACE.xs, flexWrap: 'wrap' },
  action: { flexGrow: 1 },
});
