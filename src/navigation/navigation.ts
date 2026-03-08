interface NavigationSetup {
  navLinks: NodeListOf<HTMLAnchorElement>;
  views: NodeListOf<HTMLElement>;
  defaultRoute?: string;
  onRouteChange?: (route: string) => void;
}

const GUIDE_SECTIONS = new Set(['how', 'formats', 'privacy', 'faq', 'about']);

function normalizeTarget(hash: string | null | undefined, fallback: string): string {
  if (!hash) return fallback;
  return hash.replace('#', '').trim() || fallback;
}

function resolveView(target: string): 'home' | 'guide' {
  return GUIDE_SECTIONS.has(target) ? 'guide' : 'home';
}

function setActiveLink(navLinks: NodeListOf<HTMLAnchorElement>, target: string): void {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.anchorTarget === target);
  });
}

function setActiveView(views: NodeListOf<HTMLElement>, viewName: 'home' | 'guide'): void {
  views.forEach((view) => {
    view.classList.toggle('active', view.dataset.routeView === viewName);
  });
}

function scrollToGuideSection(target: string, behavior: ScrollBehavior): void {
  const section = document.getElementById(target);
  if (!section) return;

  section.scrollIntoView({
    behavior,
    block: 'start'
  });
}

function syncNavRail(navLinks: NodeListOf<HTMLAnchorElement>): void {
  const nav = navLinks[0]?.closest<HTMLElement>('.toolbar-nav');
  if (!nav) return;

  const setHighlight = (link: HTMLAnchorElement | null, strong = false): void => {
    if (!link) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    nav.style.setProperty('--nav-spot-left', `${linkRect.left - navRect.left}px`);
    nav.style.setProperty('--nav-spot-width', `${linkRect.width}px`);
    nav.style.setProperty('--nav-spot-opacity', strong ? '0.9' : '0.62');
  };

  const activeLink = () =>
    Array.from(navLinks).find((link) => link.classList.contains('active')) ?? navLinks[0] ?? null;

  navLinks.forEach((link) => {
    link.addEventListener('mouseenter', () => setHighlight(link, true));
    link.addEventListener('focus', () => setHighlight(link, true));
  });

  nav.addEventListener('mouseleave', () => setHighlight(activeLink(), false));
  window.addEventListener('resize', () => setHighlight(activeLink(), false));

  requestAnimationFrame(() => setHighlight(activeLink(), false));
}

export function setupNavigation({
  navLinks,
  views,
  defaultRoute = 'home',
  onRouteChange
}: NavigationSetup): void {
  const guideSections = Array.from(document.querySelectorAll<HTMLElement>('[data-guide-section]'));
  let activeTarget = defaultRoute;

  const guideObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

      const current = visible[0];
      if (!current) return;

      const target = (current.target as HTMLElement).dataset.guideSection;
      if (!target || target === activeTarget) return;

      activeTarget = target;
      setActiveLink(navLinks, target);

      const desiredHash = `#${target}`;
      if (window.location.hash !== desiredHash) {
        window.history.replaceState(null, '', desiredHash);
      }

      onRouteChange?.(target);
    },
    {
      rootMargin: '-20% 0px -55% 0px',
      threshold: [0.18, 0.32, 0.5]
    }
  );

  guideSections.forEach((section) => guideObserver.observe(section));
  syncNavRail(navLinks);

  function applyTarget(incomingHash?: string, behavior: ScrollBehavior = 'auto'): void {
    const target = normalizeTarget(incomingHash ?? window.location.hash, defaultRoute);
    const viewName = resolveView(target);

    setActiveView(views, viewName);
    activeTarget = target;
    setActiveLink(navLinks, target);

    const desiredHash = `#${target}`;
    if (window.location.hash !== desiredHash) {
      window.history.replaceState(null, '', desiredHash);
    }

    if (viewName === 'guide') {
      requestAnimationFrame(() => scrollToGuideSection(target, behavior));
    } else {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior }));
    }

    onRouteChange?.(target);
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = link.dataset.anchorTarget;
      if (!target) return;

      event.preventDefault();
      applyTarget(`#${target}`, 'smooth');
    });
  });

  window.addEventListener('hashchange', () => applyTarget(window.location.hash, 'smooth'));
  applyTarget(window.location.hash, 'auto');
}
