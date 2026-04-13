import './i18n.config';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n.config';
import { zhCN } from './locales.zh-CN';
import { enUS } from './locales.en-US';

type Locale = 'zh-CN' | 'en-US';
type Messages = typeof zhCN;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  translate: (key: string, options?: Record<string, unknown>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const messages: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'en-US': enUS as unknown as Messages,
};

function normalizeLocale(value: string | undefined): Locale {
  return value?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { t: translate } = useTranslation();
  const locale = normalizeLocale(i18n.language);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale: Locale) => {
        void i18n.changeLanguage(nextLocale);
      },
      t: messages[locale],
      translate: (key: string, options?: Record<string, unknown>) => translate(key, options),
    }),
    [locale, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}