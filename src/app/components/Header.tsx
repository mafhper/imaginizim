import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { currentLang, subscribeLanguageChange, t } from '../../i18n';
import { cn } from '../utils/ui';
import { BrandMark } from './BrandMark';
import { CloseIcon, GithubIcon, MenuIcon } from './icons/AppIcons';
import { Button } from './ui/Button';

export function Header() {
  const [, setLanguageTick] = useState(currentLang());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(
    () =>
      subscribeLanguageChange(() => {
        setLanguageTick(currentLang());
      }),
    []
  );

  const navItems = [
    { label: t('nav.app'), path: '/' },
    { label: t('nav.about'), path: '/sobre' },
    { label: t('nav.faq'), path: '/faq' }
  ];

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/82 backdrop-blur-xl">
        <div className="site-shell flex h-16 items-center justify-between gap-4">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
          >
            <BrandMark />
          </NavLink>

          <nav className="nav-rail hidden items-center gap-1 rounded-[8px] border border-white/8 bg-secondary/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
              >
                {({ isActive }) => (
                  <Button
                    variant={isActive ? 'nav-active' : 'nav'}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    {item.label}
                  </Button>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/mafhper/imaginizim"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              <GithubIcon className="h-4 w-4" /> GitHub
            </a>
            <Button
              id="mobileNavToggle"
              variant="outline"
              size="icon"
              className="mobile-nav-toggle border-white/8 bg-background/50 md:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-controls="mobileNavSheet"
              aria-label={mobileOpen ? t('nav.close') : t('nav.menu')}
            >
              {mobileOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/44 backdrop-blur-sm transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div
        id="mobileNavSheet"
        className={cn(
          'mobile-nav-sheet fixed inset-x-4 top-[4.75rem] z-50 rounded-[8px] border border-white/10 bg-card/98 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-200 md:hidden',
          mobileOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        )}
      >
        <div className="mb-4 border-b border-border/70 pb-3">
          <p className="section-label mb-1">{t('nav.menu')}</p>
          <p className="text-sm text-muted-foreground">
            Acesse a ferramenta ou o contexto do produto.
          </p>
        </div>

        <nav className="grid gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-[8px] px-4 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-white/[0.06] text-foreground'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-border/70 pt-4">
          <a
            href="https://github.com/mafhper/imaginizim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon className="h-4 w-4" /> GitHub
          </a>
        </div>
      </div>
    </>
  );
}
