import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageCTA } from '../components/PageCTA';
import { BrowserIcon, GithubIcon } from '../components/icons/AppIcons';
import { AnalyzeIcon, ExportIcon, FormatIcon, OptimizeIcon } from '../components/icons/StepIcons';
import { Button } from '../components/ui/Button';

const flowSteps = [
  {
    title: 'Entrada local',
    description: 'Você solta um lote e os arquivos continuam na sessão do navegador.',
    icon: BrowserIcon
  },
  {
    title: 'Decisão curta',
    description:
      'O modo automático escolhe uma saída segura; os ajustes ficam disponíveis quando importam.',
    icon: AnalyzeIcon
  },
  {
    title: 'Entrega revisável',
    description: 'Compare sob demanda e baixe item por item ou o lote pronto em ZIP.',
    icon: ExportIcon
  }
];

const principles = [
  {
    title: 'Sem fila remota',
    description: 'O processamento principal não cria uma etapa escondida fora do seu navegador.',
    icon: BrowserIcon
  },
  {
    title: 'Controle quando precisa',
    description:
      'Qualidade, escala, formato e modo existem para casos específicos, não para atrapalhar o início.',
    icon: OptimizeIcon
  },
  {
    title: 'Base auditável',
    description: 'O projeto é aberto e mantém o core preparado para uma casca desktop futura.',
    icon: GithubIcon
  }
];

const formats = [
  {
    title: 'Fotos',
    recommendation: 'JPEG, WebP ou AVIF',
    description: 'Use quando o objetivo for reduzir peso mantendo aparência natural.'
  },
  {
    title: 'UI, logos e transparência',
    recommendation: 'PNG ou WebP',
    description: 'Preserva bordas limpas, alpha e elementos gráficos com menos surpresa.'
  },
  {
    title: 'Sem decisão manual',
    recommendation: 'Automático',
    description: 'Bom padrão para lotes mistos ou quando a prioridade é terminar rápido.'
  }
];

export function AboutPage() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (!section) return;

    const target = document.getElementById(section);
    if (!target) return;

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.search]);

  return (
    <div data-page="about" className="py-14 md:py-24">
      <div className="site-shell space-y-12 md:space-y-18">
        <section data-testid="about-hero" className="content-plain-hero">
          <div className="max-w-3xl">
            <p className="section-label mb-3">Sobre</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Compressão de imagem sem transformar o fluxo em painel técnico
            </h1>
            <p className="hero-copy-lead mt-5 text-lg leading-8 text-muted-foreground">
              O Imaginizim é uma ferramenta local-first para preparar assets com menos peso,
              comparação sob demanda e comandos que aparecem quando realmente ajudam.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/">
              <Button variant="hero" size="sm">
                Começar pelo lote
              </Button>
            </Link>
            <Link to="/faq?section=privacidade">
              <Button variant="hero-outline" size="sm">
                Ver privacidade
              </Button>
            </Link>
          </div>
        </section>

        <section id="fluxo" className="content-band-lite" data-testid="about-flow-band">
          <div className="content-band-lite__header">
            <p className="section-label mb-3">Fluxo</p>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Três decisões, sem cerimônia
            </h2>
          </div>
          <div className="process-lane mt-8">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="process-step">
                  <div className="process-step__index">{index + 1}</div>
                  <div className="process-step__icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="principle-card">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </article>
            );
          })}
        </section>

        <section id="formatos" className="content-band-lite" data-testid="about-formats-band">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <p className="section-label mb-3">Formatos</p>
              <h2 className="font-display text-3xl font-bold text-foreground">
                O formato deve servir ao arquivo
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                O padrão automático cobre o uso comum. Quando o destino pede um formato específico,
                os controles continuam próximos.
              </p>
            </div>
            <div className="format-list">
              {formats.map((format) => (
                <article key={format.title} className="format-row">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                    <FormatIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {format.title}
                      </h3>
                      <span className="text-xs font-medium text-primary">
                        {format.recommendation}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <PageCTA
          label="FAQ"
          title="Dúvidas curtas ficam concentradas em uma página"
          description="Privacidade, offline, comparação e uso em produção estão explicados sem rodeio."
          linkTo="/faq"
          linkLabel="Abrir FAQ"
        />
      </div>
    </div>
  );
}
