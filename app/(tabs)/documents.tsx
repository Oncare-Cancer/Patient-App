import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Linking,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Download,
  FileText,
  Search,
  Share2,
  Upload,
} from 'lucide-react-native';
import {
  AttachSheet,
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Screen,
  ScreenHeader,
  SkeletonList,
  Txt,
} from '@/components/ui';
import { useAttachments } from '@/hooks/useAttachments';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/contexts/LanguageContext';
import {
  listRecords,
  groupByMonth,
  type PatientRecord,
  type RecordCategory,
} from '@/services/records';
import { uploadFiles, getFileUrl } from '@/services/upload';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';
import type { StringKey } from '@/constants/i18n';

/**
 * D2 — Records.
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

export default function Records() {
  const t = useT();
  const router = useRouter();

  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RecordCategory | null>(null);
  const [uploading, setUploading] = useState(false);

  const attach = useAttachments();
  const debounced = useDebounced(search, 250);

  const load = useCallback(async () => {
    try {
      setRecords(await listRecords());
      setState('ready');
    } catch {
      setState('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  /* ----------------------------------------------------------------- upload */

  useEffect(() => {
    if (attach.files.length === 0 || uploading) return;
    setUploading(true);
    uploadFiles(attach.files, 'report')
      .then(() => {
        attach.setFiles([]);
        toastSuccess(t('ui.records.uploadReport'), t('ui.records.uploadedByYou'));
        return load();
      })
      .catch(() => toastError(t('ui.upload.uploadFailed'), t('ui.common.retry')))
      .finally(() => setUploading(false));
    // `attach` is a fresh object each render; keying on the file count is what
    // makes this fire once per pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attach.files.length]);

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
    <View style={styles.root}>
      <ScreenHeader title={t('ui.records.title')} back={false} />

      <Screen
        withNav
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
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

        <Btn
          label={t('ui.records.uploadReport')}
          variant="gradient"
          loading={uploading}
          onPress={attach.openSheet}
          icon={<Upload size={15} color={PALETTE.white} strokeWidth={2.2} />}
          style={styles.uploadBtn}
        />

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
      </Screen>

      <AttachSheet
        visible={attach.sheetOpen}
        onClose={attach.closeSheet}
        onCamera={attach.fromCamera}
        onGallery={attach.fromGallery}
        onDocument={attach.fromDocument}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  flex: { flex: 1 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
  },
  uploadBtn: { marginTop: SPACE.md, marginBottom: SPACE.lg },
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
