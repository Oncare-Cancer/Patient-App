import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Txt } from './Txt';
import { PALETTE, SPACE, SURFACE, TEXT } from '@/constants/theme';

export type TimelineStep = {
  label: string;
  /** Formatted date/time, omitted for steps that have not happened. */
  at?: string;
  done: boolean;
  /** The step currently in progress — filled dot, bold label. */
  current?: boolean;
};

/**
 * Request status timeline — screen H3, "Activity → Requests".
 *
 * Shows the whole journey up front with future steps greyed, rather than only
 * what has happened. For a patient waiting on a lab visit or a price call, the
 * value is seeing what comes next and that nothing has stalled, so the unreached
 * steps are deliberately visible rather than hidden until they occur.
 */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const reached = s.done || s.current;

        return (
          <View key={`${s.label}-${i}`} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  reached ? styles.dotOn : styles.dotOff,
                  s.current && styles.dotCurrent,
                ]}
              />
              {!last && (
                <View
                  style={[styles.line, s.done ? styles.lineOn : styles.lineOff]}
                />
              )}
            </View>

            <View style={[styles.content, last && styles.contentLast]}>
              <Txt
                variant={s.current ? 'bodyMedium' : 'body'}
                color={reached ? TEXT.primary : TEXT.muted}
              >
                {s.label}
              </Txt>
              {s.at ? (
                <Txt variant="helperSm" color={TEXT.muted} script="latin">
                  {s.at}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  rail: {
    alignItems: 'center',
    width: 12,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
  },
  dotOn: {
    backgroundColor: PALETTE.purple,
  },
  dotOff: {
    backgroundColor: SURFACE.card,
    borderWidth: 1.4,
    borderColor: '#D6D3E4',
  },
  dotCurrent: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 3,
    borderColor: '#EADDFF',
    backgroundColor: PALETTE.purple,
  },
  line: {
    flex: 1,
    width: 1.6,
    marginVertical: 2,
  },
  lineOn: {
    backgroundColor: PALETTE.purple,
  },
  lineOff: {
    backgroundColor: '#E4E1EE',
  },
  content: {
    flex: 1,
    paddingBottom: SPACE.md,
  },
  contentLast: {
    paddingBottom: 0,
  },
});
