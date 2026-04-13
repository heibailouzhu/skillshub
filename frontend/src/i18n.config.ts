import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { zhCN } from './locales.zh-CN';
import { enUS } from './locales.en-US';

export const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'skillshub-locale',
      caches: ['localStorage'],
    },
    returnObjects: true,
  });

export default i18n;