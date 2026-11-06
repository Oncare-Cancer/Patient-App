import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, CircleHelp } from 'lucide-react-native';
import {
  Btn,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { FAQView } from '@/components/FAQView';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { getFaqTabs, askUsEmailQuery } from '@/services/faq';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * FAQs and "raise a query", reached from Profile → Help.
 *
 * `FAQView` is reused as it was. It is the one old component kept intact: it
 * renders whatever shape the CMS returns, and rebuilding it would mean
 * re-deriving that shape from the data with nothing gained.
 */
export default function Faq() {
  const t = useT();
  const { patient } = useAuth();

  const [tabs, setTabs] = useState<any[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState<any | null>(null);

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setTabs(await getFaqTabs());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    const text = message.trim();
    if (text.length < 5 || sending) return;
    setSending(true);
    try {
      await askUsEmailQuery({
        name: patient?.patient_name ?? 'Patient',
        mobile: patient?.phone_number,
        message: text,
      });
      setMessage('');
      toastSuccess(t('ui.faq.querySent'), t('ui.faq.querySentBody'));
    } catch {
      toastError(t('ui.common.somethingWrong'), t('ui.common.retry'));
    } finally {
      setSending(false);
    }
  };

  // FAQView takes over the whole screen when a topic is open, as before.
  if (active) {
    return <FAQView data={active} onClose={() => setActive(null)} />;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.profile.faqs')} />

      <Screen>
        {state === 'loading' ? (
          <SkeletonList count={5} lines={0} />
        ) : state === 'error' ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<CircleHelp size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : tabs.length === 0 ? (
          <EmptyState
            icon={<CircleHelp size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.faq.empty')}
          />
        ) : (
          tabs.map((tab, i) => (
            <Pressable
              key={tab?._id ?? tab?.title ?? i}
              onPress={() => setActive(tab)}
              accessibilityRole="button"
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card tone="plain" style={styles.row}>
                <Txt variant="bodyMedium" numberOfLines={2} style={styles.flex}>
                  {tab?.title ?? tab?.name ?? t('ui.profile.faqs')}
                </Txt>
                <ChevronRight size={16} color={TEXT.muted} strokeWidth={2.2} />
              </Card>
            </Pressable>
          ))
        )}

        <Txt variant="section" style={styles.askTitle}>
          {t('ui.faq.stillNeedHelp')}
        </Txt>
        <Card tone="plain" style={styles.askCard}>
          <Field
            label={t('ui.faq.yourQuestion')}
            placeholder={t('ui.faq.questionPlaceholder')}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Btn
            label={t('ui.common.submit')}
            onPress={send}
            loading={sending}
            disabled={message.trim().length < 5}
            style={styles.send}
          />
          <Txt variant="helperSm" color={TEXT.muted}>
            {t('ui.faq.replyNote')}
          </Txt>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
    minHeight: TOUCH_MIN + 4,
  },
  askTitle: { marginTop: SPACE.lg, marginBottom: SPACE.sm },
  askCard: { gap: SPACE.sm, marginBottom: SPACE.lg },
  send: { marginTop: SPACE.xxs },
  pressed: { opacity: 0.9 },
});
