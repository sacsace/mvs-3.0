import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko';

export type AppLanguage = 'ko' | 'en';

const loadedLanguages = new Set<string>(['ko']);

/** 비활성 언어 번역은 필요 시에만 동적 로드 */
export async function ensureI18nLanguage(lang: AppLanguage): Promise<void> {
  if (!loadedLanguages.has(lang)) {
    const mod = lang === 'en' ? await import('./en') : await import('./ko');
    i18n.addResourceBundle(lang, 'translation', mod.default.translation, true, true);
    loadedLanguages.add(lang);
  }
  await i18n.changeLanguage(lang);
}

// 언어는 사용자 UI 설정(API users.settings.ui) 또는 메뉴 스토어에서 동기화 — 브라우저 저장소 사용 안 함
i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko,
    },
    lng: 'ko',
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
