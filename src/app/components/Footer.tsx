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
    <footer className="border-t border-border/40 py-12 md:py-16 mt-auto relative z-10 bg-background/50 backdrop-blur-sm">
      <div className="container max-w-6xl grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="max-w-xl">
          <p className="font-display text-xs font-semibold tracking-[0.2em] uppercase text-foreground mb-3">
            IMAGINIZIM
          </p>
          <p className="text-[15px] leading-relaxed text-muted-foreground font-medium">
            {t('footer.caption')}
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:items-end">
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <ThemeSelector />
            <LocaleSelector />
          </div>
          <a
            href={meta.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground text-[13px]"
          >
            <GithubIcon className="h-3.5 w-3.5" /> {t('footer.repo_cta')}
          </a>
          <a
            href={meta.commitUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground text-[13px]"
          >
            <ClockIcon className="h-3.5 w-3.5" /> {t('footer.latest_commit')} {meta.shortHash}
          </a>
        </div>
      </div>
    </footer>
  );
}
