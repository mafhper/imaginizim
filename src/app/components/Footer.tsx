import { useEffect, useState } from 'react';
import { currentLang, subscribeLanguageChange, t } from '../../i18n';
import { getProjectMeta } from '../../utils/projectMeta';
import { ClockIcon, GithubIcon } from './icons/AppIcons';
import { LocaleSelector } from './LocaleSelector';
import { ThemeSelector } from './ThemeSelector';

export function Footer() {
  const [, setLanguageTick] = useState(currentLang());
  const meta = getProjectMeta();

  useEffect(
    () =>
      subscribeLanguageChange(() => {
        setLanguageTick(currentLang());
      }),
    []
  );

  return (
    <footer className="border-t border-border/60 py-8 md:py-10">
      <div className="site-shell grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="max-w-xl">
          <p className="font-display text-sm font-semibold tracking-[0.08em] text-foreground">
            IMAGINIZIM
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('footer.caption')}</p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground md:items-end">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <ThemeSelector />
            <LocaleSelector />
          </div>
          <a
            href={meta.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <GithubIcon className="h-4 w-4" /> {t('footer.repo_cta')}
          </a>
          <a
            href={meta.commitUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <ClockIcon className="h-4 w-4" /> {t('footer.latest_commit')} {meta.shortHash}
          </a>
        </div>
      </div>
    </footer>
  );
}
