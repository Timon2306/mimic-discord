import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MESSAGES, type Language, type MessageKey } from '@/i18n/messages';
import { tauriApi } from '@/lib/tauri';

export type { Language, MessageKey };

const STORAGE_KEY = 'mimic.language';

export type TranslationParams = Record<string, string | number>;

export interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, params?: TranslationParams) => string;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const readStoredLanguage = (): Language => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ru' || stored === 'en') return stored;
  } catch {
    // storage unavailable — fall back to the default below
  }
  return 'en';
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
};

/** Persists the language and keeps the Rust side in sync for its runtime logs. */
export const applyLanguage = (language: Language): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // non-fatal: the choice just will not survive a restart
  }
  document.documentElement.lang = language;
  tauriApi.setLanguage(language).catch(() => {
    // backend not available (web preview) — nothing to sync
  });
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: TranslationParams) =>
      interpolate(MESSAGES[language][key] ?? MESSAGES.en[key] ?? key, params),
    [language]
  );

  const formatNumber = useCallback(
    (value: number) => value.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US'),
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t, formatNumber }),
    [language, setLanguage, t, formatNumber]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return context;
};
