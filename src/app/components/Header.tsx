import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

  const location = useLocation();
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('nav.app'), path: '/' },
    { label: t('nav.about'), path: '/sobre' }
  ];

  return (
    <>
      <header
        className={cn(
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-[650ms] ease-[cubic-bezier(0.34,1.1,0.64,1)]',
          'rounded-full border border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl',
          'motion-reduce:transition-none',
          isHome && !scrolled
            ? 'w-[calc(100%-2rem)] max-w-6xl h-16 px-6'
            : 'w-[calc(100%-2rem)] md:w-fit md:min-w-[400px] h-14 px-4 shadow-lg'
        )}
      >
        <div className="flex h-full items-center justify-between gap-4">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 flex-shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <BrandMark
              compact={(!isHome || scrolled) && !mobileOpen}
              className={cn(
                'transition-all duration-[650ms] ease-[cubic-bezier(0.34,1.1,0.64,1)]',
                (!isHome || scrolled) && 'scale-95'
              )}
            />
          </NavLink>

          <nav
            className={cn(
              'hidden items-center gap-1 md:flex transition-all duration-[650ms] ease-[cubic-bezier(0.34,1.1,0.64,1)]',
              !isHome || scrolled ? 'scale-95' : 'scale-100'
            )}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className="relative"
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      'inline-flex h-8 items-center px-4 text-xs font-medium transition-all duration-300 rounded-full whitespace-nowrap',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://github.com/mafhper/imaginizim"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'hidden items-center gap-2 text-sm text-muted-foreground transition-all duration-[650ms] ease-[cubic-bezier(0.34,1.1,0.64,1)] hover:text-foreground md:inline-flex',
                (!isHome || scrolled) && 'scale-95'
              )}
            >
              <GithubIcon className="h-4 w-4" />
              <span
                className={cn(
                  'overflow-hidden transition-all duration-[650ms] ease-[cubic-bezier(0.34,1.1,0.64,1)]',
                  !isHome || scrolled ? 'w-0 opacity-0' : 'w-auto opacity-100'
                )}
              >
                GitHub
              </span>
            </a>
            <Button
              id="mobileNavToggle"
              variant="ghost"
              size="icon"
              className="mobile-nav-toggle md:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-controls="mobileNavSheet"
              aria-label={mobileOpen ? t('nav.close') : t('nav.menu')}
            >
              {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div
        id="mobileNavSheet"
        className={cn(
          'mobile-nav-sheet fixed inset-x-4 top-[4.75rem] z-50 rounded-[8px] border border-border bg-card p-4 shadow-xl backdrop-blur-xl transition-all duration-200 md:hidden',
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
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
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
