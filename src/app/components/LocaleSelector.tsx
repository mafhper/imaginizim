import { ChangeEvent, useEffect, useState } from 'react';
import {
  currentLang,
  getSupportedLanguages,
  setLanguage,
  subscribeLanguageChange,
  t,
  type SupportedLanguage
} from '../../i18n';
import { GlobeIcon } from './icons/AppIcons';

const languageLabels: Record<SupportedLanguage, string> = {
  en: 'footer.lang_en',
  'pt-BR': 'footer.lang_pt',
  es: 'footer.lang_es'
};

export function LocaleSelector() {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const current = currentLang();
    return current === 'pt' ? 'pt-BR' : (current as SupportedLanguage);
  });

  useEffect(
    () =>
      subscribeLanguageChange(() => {
        const current = currentLang();
        setLanguageState(current === 'pt' ? 'pt-BR' : (current as SupportedLanguage));
      }),
    []
  );

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value as SupportedLanguage;
    await setLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  };

  return (
    <label className="footer-select-shell">
      <GlobeIcon className="h-4 w-4 flex-shrink-0" />
      <span className="sr-only">{t('footer.language')}</span>
      <select
        className="footer-select"
        value={language}
        onChange={handleChange}
        aria-label={t('footer.language')}
        title={t('footer.language')}
      >
        {getSupportedLanguages().map((option) => (
          <option key={option} value={option}>
            {t(languageLabels[option])}
          </option>
        ))}
      </select>
    </label>
  );
}
