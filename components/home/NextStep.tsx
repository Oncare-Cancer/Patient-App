import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, FlaskConical } from 'lucide-react-native';
import { Card, Txt } from '@/components/ui';
import {
  GRADIENT,
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * "Your next step" — the navy appointment card plus any open request row.
 *
 * Section 05 defines what goes here: "Next step = earliest upcoming appointment
 * or the latest open request". Both are shown when both exist, appointment
 * first, because a fixed time matters more than a pending ticket.
 */

export function NextAppointmentCard({
  month,
  day,
  title,
  subtitle,
  onPress,
}: {
  /** Short month, e.g. "NOV". */
  month: string;
  /** Day of month, e.g. "06". */
  day: string;
  /** "Follow-up · 2:15 PM" */
  title: string;
  /** "Dr. Rakesh Sharma · Gurugram" */
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[PALETTE.midnight, PALETTE.deepBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.apptCard}
      >
        <View style={styles.dateBlock}>
          <Txt variant="helperSm" color={TEXT.onDarkMuted} script="latin">
            {month}
          </Txt>
          <Txt variant="titleLg" color={TEXT.onDark} script="latin">
            {day}
          </Txt>
        </View>

        <View style={styles.apptMeta}>
          {/* Visit type, time, doctor and centre are record data — Latin. */}
          <Txt variant="bodyMedium" color={TEXT.onDark} script="latin" numberOfLines={1}>
            {title}
          </Txt>
          <Txt
            variant="helperSm"
            color={TEXT.onDarkMuted}
            script="latin"
            numberOfLines={1}
          >
            {subtitle}
          </Txt>
        </View>

        <LinearGradient
          colors={[...GRADIENT.selected]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chevron}
        >
          <ChevronRight size={15} color={PALETTE.white} strokeWidth={2.6} />
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
}

/** The slim white row under the appointment card, for an open request. */
export function OpenRequestRow({
  label,
  detail,
  onPress,
}: {
  /** "Lab sample collection" */
  label: string;
  /** "Scheduled Sat 7-10 AM" */
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${detail}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card tone="plain" style={styles.requestRow}>
        <FlaskConical size={15} color={PALETTE.purple} strokeWidth={2.2} />
        <View style={styles.requestMeta}>
          <Txt variant="bodySm" numberOfLines={2}>
            <Txt variant="bodyMedium">{label}</Txt>
            {detail ? ` · ${detail}` : ''}
          </Txt>
        </View>
        <ChevronRight size={15} color={TEXT.muted} strokeWidth={2.2} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.card,
    padding: SPACE.sm,
    minHeight: 68,
  },
  dateBlock: {
    width: 48,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACE.xs,
  },
  apptMeta: {
    flex: 1,
  },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.xs,
    minHeight: TOUCH_MIN,
    backgroundColor: SURFACE.card,
  },
  requestMeta: {
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
  },
});
