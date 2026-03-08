import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { currentTheme, subscribeThemeChange, toggleTheme } from '../../theme';
import { ThemeDarkIcon, ThemeLightIcon } from './icons/AppIcons';

export function ThemeSelector() {
  const [theme, setThemeState] = useState(currentTheme());

  useEffect(() => subscribeThemeChange(setThemeState), []);

  const isDark = theme === 'dark';
  const Icon = isDark ? ThemeDarkIcon : ThemeLightIcon;
  const title = isDark ? t('footer.theme_dark') : t('footer.theme_light');
  const action = isDark ? t('footer.theme_toggle_to_light') : t('footer.theme_toggle_to_dark');
  const label = `${t('footer.theme')}: ${title}. ${action}`;

  return (
    <button
      type="button"
      className="footer-control-button"
      onClick={() => toggleTheme()}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden text-xs font-medium sm:inline">{title}</span>
    </button>
  );
}
