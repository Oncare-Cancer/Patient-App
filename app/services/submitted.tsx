import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, MessageCircle } from 'lucide-react-native';
import { Btn, Card, Screen, ScreenHeader, Txt } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { SPACE, SURFACE, TEXT } from '@/constants/theme';

/**
 * E3 — Request submitted.
 *
 * Shared by every request type. The PDF says so explicitly under E3: "Same
 * screen is used for every Home Care, Second Opinion and Admission request", and
 * the medicine and lab flows end the same way. One screen means the request id,
 * the WhatsApp promise and the Track action cannot drift apart between services.
 *
 * Everything it shows arrives as route params, so it holds no service-specific
 * knowledge.
 */
export default function RequestSubmitted() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{
    requestId?: string;
    mobile?: string;
    /** Up to three "label|value" pairs for the summary block. */
    rows?: string;
  }>();

  const rows = (params.rows ?? '')
    .split('~')
    .map((pair) => pair.split('|'))
    .filter((p) => p.length === 2 && p[0] && p[1]) as [string, string][];

  return (
    <View style={styles.root}>
      {/* No back chevron: going back would re-open a form whose request is
          already raised. */}
      <ScreenHeader back={false} />

      <Screen>
        <View style={styles.center}>
          <View style={styles.badge}>
            <Check size={26} color="#16A34A" strokeWidth={3} />
          </View>

          <Txt variant="titleLg" center>
            {t('ui.homeCare.submittedTitle')}
          </Txt>

          {params.mobile ? (
            <>
              <Txt variant="body" color={TEXT.secondary} center>
                {t('ui.homeCare.willCallYou')}
              </Txt>
              <Txt variant="section" script="latin" center>
                +91 {params.mobile}
              </Txt>
            </>
          ) : null}

          {params.requestId ? (
            <View style={styles.idChip}>
              <Txt variant="helperSm" color={TEXT.muted} center>
                {t('ui.homeCare.requestId')}
              </Txt>
              <Txt variant="section" script="latin" center>
                {params.requestId}
              </Txt>
            </View>
          ) : null}
        </View>

        {rows.length > 0 ? (
          <Card tone="plain" style={styles.summary}>
            {rows.map(([label, value], i) => (
              <View
                key={`${label}-${i}`}
                style={[styles.row, i > 0 && styles.rowDivider]}
              >
                <Txt variant="helperSm" color={TEXT.muted} style={styles.flex}>
                  {label}
                </Txt>
                <Txt variant="helper" script="latin" numberOfLines={2} style={styles.value}>
                  {value}
                </Txt>
              </View>
            ))}
          </Card>
        ) : null}

        <Card tone="plain" style={styles.whatsapp}>
          <MessageCircle size={14} color="#1B7A42" strokeWidth={2.4} />
          <Txt variant="helperSm" color="#1B7A42" style={styles.flex}>
            {t('ui.homeCare.whatsappUpdates')}
          </Txt>
        </Card>

        <Btn
          label={t('ui.homeCare.trackRequest')}
          onPress={() => router.replace('/(tabs)/appointments')}
          style={styles.track}
        />
        <Btn
          label={t('ui.booking.backToHome')}
          variant="secondary"
          onPress={() => router.replace('/(tabs)')}
          style={styles.home}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    gap: SPACE.xxs,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.lg,
  },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E7F6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  idChip: {
    backgroundColor: SURFACE.tint,
    borderRadius: 12,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    marginTop: SPACE.md,
    alignItems: 'center',
  },
  summary: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.divider,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
    backgroundColor: '#EAF8EF',
    borderColor: '#CDEBD8',
  },
  track: {
    marginTop: SPACE.lg,
  },
  home: {
    marginTop: SPACE.sm,
  },
});
