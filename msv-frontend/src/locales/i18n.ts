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

/** 활성 UI 언어에 맞춰 SEO 메타(title/description/html lang) 동기화 */
const syncDocumentSeo = (lng: string) => {
  if (typeof document === 'undefined') return;
  const isEnglish = String(lng).toLowerCase().indexOf('en') === 0;
  document.documentElement.lang = isEnglish ? 'en' : 'ko';
  document.title = i18n.t('seo.title');
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag) descTag.setAttribute('content', i18n.t('seo.description'));
};

i18n.on('languageChanged', syncDocumentSeo);
syncDocumentSeo(i18n.language);

export default i18n;
