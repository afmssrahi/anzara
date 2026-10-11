'use client';

/**
 * Lightweight i18n provider.
 * Reads the active locale from localStorage (if available), falls back to 'en'.
 * Use the `useT()` hook in components to access translated strings.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type Dictionary } from './en';
import { bn } from './bn';

export type Locale = 'en' | 'bn';
export const LOCALES: Locale[] = ['en', 'bn'];

const STORAGE_KEY = 'anzara.locale';
const COOKIE_KEY = 'anzara_locale';
const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, Dictionary> = { en, bn };

export type { Dictionary } from './en';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  format: (key: string, replacements: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const fromStorage = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (fromStorage === 'en' || fromStorage === 'bn') return fromStorage;
  } catch {
    // localStorage may be unavailable in private mode
  }
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_KEY}=`));
  if (cookie) {
    const value = cookie.substring(COOKIE_KEY.length + 1) as Locale;
    if (value === 'en' || value === 'bn') return value;
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn')) {
    return 'bn';
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  // On mount in the browser, switch to the detected locale if we don't have one yet
  useEffect(() => {
    if (!initialLocale) {
      const detected = detectInitialLocale();
      if (detected !== locale) setLocaleState(detected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, []);

  const format = useCallback((template: string, replacements: Record<string, string | number>) => {
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
      replacements[key] !== undefined ? String(replacements[key]) : `{${key}}`,
    );
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      format,
    }),
    [locale, setLocale, format],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: en,
      format: (k) => k,
    };
  }
  return ctx;
}

export function useLocale(): Locale {
  return useT().locale;
}
