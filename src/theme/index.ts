const THEME_STORAGE_KEY = 'imaginizim.theme';
const THEME_EVENT = 'imaginizim:theme-change';

export type ThemePreference = 'dark' | 'light';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'dark' || value === 'light';
}

function getStoredTheme(): ThemePreference | null {
  if (!isBrowser()) return null;

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: ThemePreference): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function resolveSystemTheme(): ThemePreference {
  if (!isBrowser()) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function notifyThemeChange(theme: ThemePreference): void {
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

function applyTheme(theme: ThemePreference): void {
  if (!isBrowser()) return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (document.body) {
    document.body.dataset.theme = theme;
  }
}

export function initTheme(): ThemePreference {
  const resolvedTheme = getStoredTheme() ?? resolveSystemTheme();
  applyTheme(resolvedTheme);

  if (isBrowser()) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    mediaQuery.addEventListener('change', () => {
      if (getStoredTheme()) return;
      const theme = resolveSystemTheme();
      applyTheme(theme);
      notifyThemeChange(theme);
    });
  }

  return resolvedTheme;
}

export function currentTheme(): ThemePreference {
  if (!isBrowser()) return 'dark';
  const theme = document.documentElement.dataset.theme;
  return isThemePreference(theme) ? theme : resolveSystemTheme();
}

export function setTheme(theme: ThemePreference): void {
  persistTheme(theme);
  applyTheme(theme);
  notifyThemeChange(theme);
}

export function toggleTheme(): ThemePreference {
  const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  return nextTheme;
}

export function subscribeThemeChange(callback: (theme: ThemePreference) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ThemePreference>).detail;
    callback(isThemePreference(detail) ? detail : currentTheme());
  };

  window.addEventListener(THEME_EVENT, handler as EventListener);
  return () => window.removeEventListener(THEME_EVENT, handler as EventListener);
}
