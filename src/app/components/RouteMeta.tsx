import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_META: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  '/': {
    title: 'Imaginizim | Otimização local de imagens',
    description:
      'Compressão local de imagens com comparação sob demanda, formatos modernos e workflow rápido direto no navegador.'
  },
  '/como-funciona': {
    title: 'Sobre | Imaginizim',
    description:
      'Veja como o Imaginizim funciona, quando usar cada formato e qual é a proposta do projeto.'
  },
  '/formatos': {
    title: 'Sobre | Imaginizim',
    description:
      'Veja como o Imaginizim funciona, quando usar cada formato e qual é a proposta do projeto.'
  },
  '/privacidade': {
    title: 'FAQ | Imaginizim',
    description:
      'Respostas rápidas sobre uso real, comparação, modo offline e privacidade no Imaginizim.'
  },
  '/faq': {
    title: 'FAQ | Imaginizim',
    description:
      'Respostas rápidas sobre produção, modo offline, comparação e roadmap desktop do Imaginizim.'
  },
  '/sobre': {
    title: 'Sobre | Imaginizim',
    description:
      'Entenda o fluxo do Imaginizim, veja quando usar cada formato e conheça a proposta do projeto.'
  }
};

function upsertMeta(selector: string, attr: 'content' | 'href', value: string) {
  const element = document.head.querySelector(selector);
  if (element instanceof HTMLMetaElement || element instanceof HTMLLinkElement) {
    element.setAttribute(attr, value);
  }
}

export function RouteMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = ROUTE_META[location.pathname] ?? ROUTE_META['/'];
    const canonicalUrl = `https://mafhper.github.io/imaginizim/#${location.pathname}`;
    const routeName =
      location.pathname === '/' ? 'home' : location.pathname.replace(/^\//, '').replace(/\//g, '-');
    const routeGroup = location.pathname === '/' ? 'home' : 'editorial';

    document.title = meta.title;
    document.body.dataset.pageRoute = routeName;
    document.body.dataset.pageGroup = routeGroup;
    upsertMeta('meta[name="description"]', 'content', meta.description);
    upsertMeta('meta[property="og:title"]', 'content', meta.title);
    upsertMeta('meta[property="og:description"]', 'content', meta.description);
    upsertMeta('meta[name="twitter:title"]', 'content', meta.title);
    upsertMeta('meta[name="twitter:description"]', 'content', meta.description);
    upsertMeta('meta[property="og:url"]', 'content', canonicalUrl);
    upsertMeta('link[rel="canonical"]', 'href', canonicalUrl);

    return () => {
      delete document.body.dataset.pageRoute;
      delete document.body.dataset.pageGroup;
    };
  }, [location.pathname]);

  return null;
}
