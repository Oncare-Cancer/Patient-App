import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Search } from 'lucide-react-native';
import {
  Btn,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Screen,
  ScreenHeader,
  SkeletonList,
} from '@/components/ui';
import { BlogRow } from '@/components/discover/Cards';
import { useDebounced } from '@/hooks/useDebounced';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { listBlogs, type BlogCard, type ChipOption } from '@/services/content';
import { PALETTE, SPACE, SURFACE } from '@/constants/theme';

/**
 * All articles, filterable the way the website's /blogs/ page is: by
 * language (English, Hindi, Kannada, Tamil) and by topic, plus a search.
 *
 * Opens in the app's own language, because a Hindi reader landing on 900
 * English articles first would have to dig for theirs.
 */
const PAGE = 20;

export default function Blogs() {
  const t = useT();
  const router = useRouter();
  const { locale } = useLanguage();

  const [lang, setLang] = useState(locale === 'hi' ? 'hi' : 'en');
  const [topic, setTopic] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 350);

  const [list, setList] = useState<BlogCard[]>([]);
  const [langs, setLangs] = useState<ChipOption[]>([]);
  const [topics, setTopics] = useState<ChipOption[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [more, setMore] = useState(false);
  /** Ignores a slow response that arrives after the filters changed. */
  const seq = useRef(0);

  const load = useCallback(
    async (nextPage: number) => {
      const mine = ++seq.current;
      if (nextPage === 0) setState('loading');
      else setMore(true);
      try {
        const res = await listBlogs({ lang, topic, q, page: nextPage, limit: PAGE });
        if (mine !== seq.current) return;
        setList((prev) => (nextPage === 0 ? res.list : [...prev, ...res.list]));
        setPage(nextPage);
        setHasMore(res.hasMore);
        if (res.langs.length) setLangs(res.langs);
        if (res.topics.length) setTopics(res.topics);
        setState('ready');
      } catch {
        if (mine === seq.current && nextPage === 0) setState('error');
      } finally {
        if (mine === seq.current) setMore(false);
      }
    },
    [lang, topic, q]
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  const chips = (options: ChipOption[], value: string, onChange: (v: string) => void) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      style={styles.bleed}
    >
      {options.map((o) => (
        <Chip key={o.id} label={o.label} selected={value === o.id} onPress={() => onChange(o.id)} />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.discover.articles')} />
      <Screen scrollResetKey={`${lang}-${topic}-${q}`}>
        <Field
          icon={<Search size={15} color={PALETTE.purple} strokeWidth={2} />}
          placeholder={t('ui.home.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={styles.search}
        />
        {langs.length ? chips(langs, lang, setLang) : null}
        {topics.length ? chips(topics, topic, setTopic) : null}

        {state === 'loading' ? (
          <SkeletonList count={6} lines={2} />
        ) : state === 'error' ? (
          <ErrorState onRetry={() => void load(0)} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} color={PALETTE.purple} strokeWidth={2} />}
            title={t('ui.discover.noArticles')}
          />
        ) : (
          <>
            {list.map((b) => (
              <BlogRow
                key={b.slug}
                blog={b}
                onPress={() =>
                  router.push({ pathname: '/discover/blog/[slug]', params: { slug: b.slug } } as never)
                }
              />
            ))}
            {hasMore ? (
              <Btn
                label={t('ui.discover.loadMore')}
                variant="secondary"
                loading={more}
                onPress={() => void load(page + 1)}
                style={styles.more}
              />
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
  search: { marginBottom: SPACE.sm },
  bleed: { marginHorizontal: -SPACE.gutter, marginBottom: SPACE.sm },
  chips: { gap: SPACE.xs, paddingHorizontal: SPACE.gutter },
  more: { marginTop: SPACE.xs },
});
