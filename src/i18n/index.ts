import i18next from 'i18next';
import en from '../locales/en.json';
import ptBr from '../locales/pt-br.json';
import es from '../locales/es.json';

const LANGUAGE_STORAGE_KEY = 'imaginizim.language';
const SUPPORTED_LANGUAGES = ['en', 'pt-BR', 'es'] as const;
const LANGUAGE_EVENT = 'imaginizim:language-change';

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

let initialized = false;

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  if (!value) return false;
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function getStoredLanguage(): SupportedLanguage | null {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function persistLanguage(language: SupportedLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore persistence failures in restricted browser contexts.
  }
}

function notifyLanguageChange(): void {
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT));
}

function resolveLanguageFromNavigator(): SupportedLanguage {
  const browserLanguages = [
    ...(navigator.languages ?? []),
    navigator.language,
    (navigator as { userLanguage?: string }).userLanguage
  ].filter(Boolean) as string[];

  for (const language of browserLanguages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('pt')) return 'pt-BR';
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('en')) return 'en';
  }

  return 'en';
}

function resolveLanguage(): SupportedLanguage {
  return getStoredLanguage() ?? resolveLanguageFromNavigator();
}

export async function initI18n(): Promise<void> {
  if (initialized) return;

  const resolvedLanguage = resolveLanguage();

  await i18next.init({
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: { translation: en },
      'pt-BR': { translation: ptBr },
      pt: { translation: ptBr },
      es: { translation: es }
    }
  });

  initialized = true;
  persistLanguage(resolvedLanguage);
  await i18next.changeLanguage(resolvedLanguage);
  updateContent();
  notifyLanguageChange();
}

export function updateContent(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');
  elements.forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) return;
    element.textContent = i18next.t(key);
  });

  const placeholders = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '[data-i18n-placeholder]'
  );
  placeholders.forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (!key) return;
    element.placeholder = i18next.t(key);
  });

  const titles = document.querySelectorAll<HTMLElement>('[data-i18n-title]');
  titles.forEach((element) => {
    const key = element.dataset.i18nTitle;
    if (!key) return;
    element.title = i18next.t(key);
  });

  const ariaLabels = document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]');
  ariaLabels.forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (!key) return;
    element.setAttribute('aria-label', i18next.t(key));
  });

  document.documentElement.lang = i18next.resolvedLanguage ?? i18next.language;
}

export function t(key: string): string {
  return i18next.t(key);
}

export function currentLang(): string {
  return i18next.resolvedLanguage ?? i18next.language;
}

export async function setLanguage(language: SupportedLanguage): Promise<void> {
  if (!initialized) {
    await initI18n();
  }

  persistLanguage(language);
  await i18next.changeLanguage(language);
  updateContent();
  notifyLanguageChange();
}

export function getSupportedLanguages(): readonly SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

export function subscribeLanguageChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(LANGUAGE_EVENT, handler);
  return () => window.removeEventListener(LANGUAGE_EVENT, handler);
}
