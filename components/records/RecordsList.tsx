import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Linking,
  Share,
} from 'react-native';
import {
  Download,
  FileText,
  Search,
  Share2,
} from 'lucide-react-native';
import {
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/contexts/LanguageContext';
import {
  listRecords,
  groupByMonth,
  type PatientRecord,
  type RecordCategory,
} from '@/services/records';
import { getFileUrl } from '@/services/upload';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  RADIUS,
  SPACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';
import type { StringKey } from '@/constants/i18n';

/**
 * D2 — Records, as a list that can sit inside any screen.
 *
 * Lives here rather than in app/(tabs)/documents.tsx because round 7 shows it
 * in two places: the Reports tab of My Care, and the old Records route, which
 * stays so links and document notifications still open. One list, so the two
 * cannot drift.
 *
 * Replaces a flat list that showed raw file names like "Flux_Dev_A_young_mus"
 * (issue #9). Titles, categories and the source line are derived in
 * services/records.ts — see the long note there on why they cannot come from
 * the HIS.
 *
 * The category chips only render for categories that actually have documents.
 * The design shows four fixed chips, but the data distinguishes little beyond
 * prescriptions, and four chips where two always read "0" would be a worse
 * answer than fewer honest ones.
 */

const CATEGORY_LABEL: Record<RecordCategory, StringKey> = {
  lab: 'ui.records.lab',
  scan: 'ui.records.scans',
  rx: 'ui.records.rx',
  discharge: 'ui.records.discharge',
  other: 'ui.records.other',
};

const BADGE_FILL: Record<RecordCategory, string> = {
  lab: '#E7F6EC',
  scan: '#E8F0FE',
  rx: '#F1E9FF',
  discharge: '#FEF3E2',
  other: '#F1F0F6',
};

export function RecordsList({
  reloadKey = 0,
  onSettled,
}: {
  /** Bump to reload, e.g. from the host screen's pull-to-refresh. */
  reloadKey?: number;
  /** Called after each load settles, so the host can stop its spinner. */
  onSettled?: () => void;
}) {
  const t = useT();

  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RecordCategory | null>(null);

  const debounced = useDebounced(search, 250);

  const load = useCallback(async () => {
    try {
      setRecords(await listRecords());
      setState('ready');
    } catch {
      setState('error');
    } finally {
      onSettled?.();
    }
    // onSettled is a callback from the host; reloading because its identity
    // changed would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  /** Only the categories present in the data get a chip. */
  const presentCategories = useMemo(() => {
    const counts = new Map<RecordCategory, number>();
    records.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return records.filter((r) => {
      if (category && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.fileName ?? '').toLowerCase().includes(q)
      );
    });
  }, [records, category, debounced]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  /*
   * There was an "Upload a report" button here, and it has been removed.
   *
   * It did upload the file to our own storage, but this list is read from
   * Docpulse, which does not accept patient-supplied documents — so the file
   * went somewhere the patient could never see it and the screen looked
   * unchanged. A button that appears to work and silently drops the patient's
   * biopsy report is worse than no button.
   *
   * Reports still reach us where they are actually needed and actually read:
   * attached to a Second Opinion or a service request, which the team works
   * from.
   */

  /* ------------------------------------------------------------- open/share */

  const open = async (r: PatientRecord) => {
    // Private documents are behind a short-lived presigned URL; legacy ones
    // still have a direct url.
    const url = r.fileKey ? await getFileUrl(r.fileKey) : r.url;
    if (!url) {
      toastError(t('ui.common.somethingWrong'));
      return;
    }
    Linking.openURL(url).catch(() => toastError(t('ui.common.somethingWrong')));
  };

  const share = async (r: PatientRecord) => {
    const url = r.fileKey ? await getFileUrl(r.fileKey) : r.url;
    if (!url) return;
    Share.share({ message: `${r.title}\n${url}` }).catch(() => {});
  };

  return (
    <>
        <Field
          icon={<Search size={15} color={TEXT.muted} strokeWidth={2} />}
          placeholder={t('ui.records.search')}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />

        {presentCategories.length > 1 ? (
          <View style={styles.chips}>
            <Chip
              label={t('ui.records.all')}
              count={records.length}
              selected={category === null}
              onPress={() => setCategory(null)}
            />
            {presentCategories.map(([cat, count]) => (
              <Chip
                key={cat}
                label={t(CATEGORY_LABEL[cat])}
                count={count}
                selected={category === cat}
                onPress={() => setCategory(category === cat ? null : cat)}
              />
            ))}
          </View>
        ) : null}

        {state === 'loading' ? (
          <SkeletonList count={6} lines={1} />
        ) : state === 'error' ? (
          <ErrorState
            onRetry={() => void load()}
            icon={<FileText size={22} color={PALETTE.purple} strokeWidth={2} />}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.records.empty')}
            body={t('ui.records.emptyBody')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.label}>
              <Txt variant="helper" color={TEXT.muted} style={styles.monthLabel}>
                {group.label}
              </Txt>

              {group.items.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => void open(r)}
                  accessibilityRole="button"
                  accessibilityLabel={r.title}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Card tone="plain" style={styles.row}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: BADGE_FILL[r.category] },
                      ]}
                    >
                      <Txt variant="helperSm" script="latin">
                        {r.badge}
                      </Txt>
                    </View>

                    <View style={styles.meta}>
                      <View style={styles.titleRow}>
                        <Txt variant="bodyMedium" numberOfLines={1} style={styles.flex}>
                          {r.title}
                        </Txt>
                        {r.isNew ? (
                          <View style={styles.newTag}>
                            <Txt variant="helperSm" color={PALETTE.white}>
                              {t('ui.records.new')}
                            </Txt>
                          </View>
                        ) : null}
                      </View>

                      <Txt
                        variant="helperSm"
                        color={TEXT.muted}
                        script="latin"
                        numberOfLines={1}
                      >
                        {r.source === 'uploadedByYou'
                          ? t('ui.records.uploadedByYou')
                          : r.source}
                        {r.fileName ? ` · ${r.fileName}` : ''}
                      </Txt>
                    </View>

                    <Pressable
                      onPress={() => void share(r)}
                      accessibilityRole="button"
                      accessibilityLabel={t('ui.common.share')}
                      hitSlop={10}
                      style={styles.action}
                    >
                      <Share2 size={15} color={TEXT.muted} strokeWidth={2.2} />
                    </Pressable>
                    <Pressable
                      onPress={() => void open(r)}
                      accessibilityRole="button"
                      accessibilityLabel={t('ui.common.download')}
                      hitSlop={10}
                      style={styles.action}
                    >
                      <Download size={15} color={TEXT.muted} strokeWidth={2.2} />
                    </Pressable>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))
        )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
  },
  monthLabel: { marginTop: SPACE.sm, marginBottom: SPACE.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
    minHeight: TOUCH_MIN + 8,
  },
  badge: {
    minWidth: 42,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  meta: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  newTag: {
    backgroundColor: PALETTE.pink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  action: { padding: 2 },
  pressed: { opacity: 0.9 },
});
