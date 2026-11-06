import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Txt } from './Txt';
import { Btn } from './Btn';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';
import { useT } from '@/contexts/LanguageContext';

/**
 * Empty and error states.
 *
 * NOT IN THE PDF — see the note in Skeleton.tsx. The copy avoids apologising or
 * blaming the patient, and an error always offers the retry rather than leaving
 * them on a dead screen.
 */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Txt variant="section" center>
        {title}
      </Txt>
      {body ? (
        <Txt variant="body" color={TEXT.secondary} center style={styles.body}>
          {body}
        </Txt>
      ) : null}
      {actionLabel && onAction ? (
        <Btn
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
          block={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

/** Error variant with the standard retry wording. */
export function ErrorState({
  onRetry,
  icon,
}: {
  onRetry: () => void;
  icon?: React.ReactNode;
}) {
  const t = useT();
  return (
    <EmptyState
      icon={icon}
      title={t('ui.common.somethingWrong')}
      body={t('ui.common.noInternet')}
      actionLabel={t('ui.common.retry')}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: SPACE.xxl,
    paddingHorizontal: SPACE.lg,
    gap: SPACE.xxs,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.sm,
  },
  body: {
    marginTop: 2,
  },
  action: {
    marginTop: SPACE.md,
  },
});
