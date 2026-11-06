import React, { useState } from 'react';
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown } from 'lucide-react-native';
import { Txt } from './Txt';
import { useT } from '@/contexts/LanguageContext';
import {
  PALETTE,
  RADIUS,
  SHADOW,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

export type SelectOption = { value: string; label: string };

/**
 * Dropdown, rendered as a bottom sheet rather than a native picker.
 *
 * Two reasons: the native picker looks different on each platform and would be
 * the one control in the app that ignores the design system, and the iOS wheel
 * is poor for long lists like the cancer-type field on H1.
 */
export function Select({
  label,
  hint,
  placeholder,
  value,
  options,
  onChange,
  /** Keeps option labels in Latin — cancer types and doctor names. */
  latin,
  error,
  disabled,
}: {
  label?: string;
  hint?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  latin?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label ? (
        <View style={styles.labelRow}>
          <Txt variant="helper" color={TEXT.secondary}>
            {label}
          </Txt>
          {hint ? (
            <Txt variant="helperSm" color={TEXT.muted}>
              {hint}
            </Txt>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={disabled ? undefined : () => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label }}
        style={({ pressed }) => [
          styles.box,
          !!error && styles.boxError,
          disabled && styles.boxDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Txt
          variant={selected ? 'bodyMedium' : 'body'}
          color={selected ? TEXT.primary : TEXT.muted}
          script={latin && selected ? 'latin' : 'auto'}
          numberOfLines={1}
          style={styles.flex}
        >
          {selected?.label ?? placeholder ?? t('ui.common.search')}
        </Txt>
        <ChevronDown size={16} color={TEXT.muted} strokeWidth={2.2} />
      </Pressable>

      {error ? (
        <Txt variant="helperSm" color={PALETTE.sosRed} style={styles.error}>
          {error}
        </Txt>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel={t('ui.common.cancel')}
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.md }]}
        >
          <View style={styles.grabber} />
          {label ? (
            <Txt variant="section" style={styles.sheetTitle}>
              {label}
            </Txt>
          ) : null}

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((o, i) => {
              const active = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.option,
                    i > 0 && styles.optionDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <Txt
                    variant={active ? 'bodyMedium' : 'body'}
                    script={latin ? 'latin' : 'auto'}
                    style={styles.flex}
                  >
                    {o.label}
                  </Txt>
                  {active ? (
                    <Check size={17} color={PALETTE.purple} strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xxs,
    marginBottom: SPACE.xxs,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TOUCH_MIN,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACE.sm,
  },
  boxError: {
    borderColor: PALETTE.sosRed,
  },
  boxDisabled: {
    backgroundColor: SURFACE.disabled,
  },
  error: {
    marginTop: SPACE.xxs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,20,45,0.55)',
  },
  sheet: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.sm,
    maxHeight: '72%',
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
  sheetTitle: {
    marginBottom: SPACE.xs,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN + 4,
  },
  optionDivider: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
  },
  pressed: {
    opacity: 0.8,
  },
});
