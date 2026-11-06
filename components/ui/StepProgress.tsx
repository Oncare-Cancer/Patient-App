import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Txt } from './Txt';
import { PALETTE, SPACE, TEXT } from '@/constants/theme';

type Props = {
  steps: string[];
  /** Zero-based index of the step the patient is on. */
  current: number;
  /** Rendered inside the navy header, so the colours invert. */
  onDark?: boolean;
};

/**
 * The 4-step booking progress bar (C1-C4): "Centre — Doctor — Slot — Confirm".
 *
 * Completed steps show a tick, the current one shows its number in violet, and
 * later ones stay muted. The PDF's own screens use exactly this, and showing a
 * tick rather than a number is what tells a patient mid-flow that the earlier
 * step is done rather than merely passed.
 */
export function StepProgress({ steps, current, onDark }: Props) {
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const dim = onDark ? 'rgba(255,255,255,0.45)' : TEXT.muted;

        return (
          <React.Fragment key={label}>
            <View style={styles.step}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                  !done && !active && (onDark ? styles.dotIdleOnDark : styles.dotIdle),
                ]}
              >
                {done ? (
                  <Check size={10} color={PALETTE.white} strokeWidth={3} />
                ) : (
                  <Txt
                    variant="helperSm"
                    script="latin"
                    color={active ? PALETTE.white : dim}
                  >
                    {i + 1}
                  </Txt>
                )}
              </View>
              <Txt
                variant="helperSm"
                color={
                  done || active
                    ? onDark
                      ? TEXT.onDark
                      : PALETTE.midnight
                    : dim
                }
                numberOfLines={1}
              >
                {label}
              </Txt>
            </View>

            {i < steps.length - 1 && (
              <View
                style={[
                  styles.line,
                  done
                    ? styles.lineDone
                    : onDark
                    ? styles.lineIdleOnDark
                    : styles.lineIdle,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
  },
  dot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: PALETTE.purple,
  },
  dotActive: {
    backgroundColor: PALETTE.purple,
  },
  dotIdle: {
    borderWidth: 1.2,
    borderColor: '#C9C7D8',
  },
  dotIdleOnDark: {
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  line: {
    flex: 1,
    height: 1.4,
    marginHorizontal: SPACE.xxs,
  },
  lineDone: {
    backgroundColor: PALETTE.purple,
  },
  lineIdle: {
    backgroundColor: '#DDDBE8',
  },
  lineIdleOnDark: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});
