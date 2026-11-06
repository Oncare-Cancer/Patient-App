import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  translate,
  isDevanagari,
  type Locale,
  type StringKey,
  type TParams,
} from '@/constants/i18n';

const STORAGE_KEY = 'app_locale';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Translate a key. Stable across renders for the same locale. */
  t: (key: StringKey, params?: TParams) => string;
  /** True when the current locale needs the Devanagari font. */
  devanagari: boolean;
  /** False until the saved choice has been read, so we don't flash English. */
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

/**
 * Picks the starting language from the device when the patient has not chosen
 * one yet. A Hindi-locale phone gets Hindi on first launch, which is the whole
 * point of offering it — asking an older patient to find a language setting
 * before they can read the screen defeats it.
 */
function deviceDefault(): Locale {
  try {
    const tags = getLocales();
    if (tags.some((l) => l.languageCode === 'hi')) return 'hi';
  } catch {
    // expo-localization unavailable (rare, web edge cases) — fall through.
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        setLocaleState(saved === 'hi' || saved === 'en' ? saved : deviceDefault());
      } catch {
        setLocaleState(deviceDefault());
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Persist in the background; a failed write only costs the preference on
    // next launch, so it must not block the UI from switching.
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      devanagari: isDevanagari(locale),
      ready,
    }),
    [locale, setLocale, ready]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

/** Shorthand for the common case of only needing `t`. */
export function useT() {
  return useLanguage().t;
}
