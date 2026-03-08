import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageCTA } from '../components/PageCTA';
import {
  ContentBandSection,
  ContentHeroSection,
  EvidenceCardRow
} from '../components/content/SectionTemplates';
import { BrowserIcon, ClockIcon, GithubIcon } from '../components/icons/AppIcons';
import { AnalyzeIcon, ExportIcon, FormatIcon, OptimizeIcon } from '../components/icons/StepIcons';

const introCards = [
  {
    title: 'Local',
    subtitle: 'Sem etapa externa',
    description: 'Roda no navegador e evita etapas externas no fluxo principal.',
    icon: BrowserIcon
  },
  {
    title: 'Rápido',
    subtitle: 'Resultado direto',
    description: 'Entra no lote, comprime e devolve o resultado sem ruído.',
    icon: ClockIcon
  },
  {
    title: 'Aberto',
    subtitle: 'Código auditável',
    description: 'Código auditável hoje e base pronta para desktop depois.',
    icon: GithubIcon
  },
  {
    title: 'Analisa',
    subtitle: 'Lê o arquivo',
    description: 'Entende o que precisa ser preservado antes de comprimir.',
    icon: AnalyzeIcon
  },
  {
    title: 'Otimiza',
    subtitle: 'Escolhe a saída',
    description: 'Decide a melhor compressão de acordo com o formato e o objetivo.',
    icon: OptimizeIcon
  },
  {
    title: 'Exporta',
    subtitle: 'Fecha o lote',
    description: 'Entrega o arquivo final pronto para baixar sozinho ou em lote.',
    icon: ExportIcon
  }
];

const formatCards = [
  {
    title: 'JPEG',
    description: 'Escolha padrão para fotos e imagens com muitas cores.',
    goodFor: 'Publicação ampla e peso controlado.',
    avoid: 'Quando o arquivo precisar de transparência.'
  },
  {
    title: 'PNG',
    description: 'Melhor para logo, interface, ícone e transparência.',
    goodFor: 'Bordas limpas e alpha preservado.',
    avoid: 'Lotes de fotos, porque tende a pesar mais.'
  },
  {
    title: 'WebP / AVIF',
    description: 'Use quando a prioridade for reduzir peso na web.',
    goodFor: 'Entrega moderna e payload menor.',
    avoid: 'Contextos que ainda pedem fallback amplo.'
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
      <div className="site-shell space-y-14 md:space-y-24">
        <ContentHeroSection
          testId="about-hero"
          layout="stacked"
          copy={
            <>
              <p className="section-label mb-3">Sobre</p>
              <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
                Um compressor local pensado para uso real
              </h1>
              <p className="hero-copy-lead mt-4 text-lg leading-8 text-muted-foreground">
                O Imaginizim existe para reduzir peso sem transformar a tarefa em uma tela técnica.
                Você envia o arquivo, recebe o resultado e segue o fluxo.
              </p>
            </>
          }
          visual={
            <EvidenceCardRow
              testId="about-workflow-cards"
              columnsClassName="md:grid-cols-2 xl:grid-cols-3"
              className="w-full"
            >
              {introCards.map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="glass-card p-6 md:p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 font-display text-[1.65rem] font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-base font-medium text-primary/80">{step.subtitle}</p>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </EvidenceCardRow>
          }
          visualClassName="content-hero-visual-wide"
        />

        <section id="formatos">
          <ContentBandSection
            testId="about-formats-band"
            centered
            kicker="Formatos"
            title="Formatos principais"
            description={
              <p className="hero-copy-lead">
                Foto vai para JPEG, transparência vai para PNG e peso menor pede WebP ou AVIF.
              </p>
            }
          >
            <EvidenceCardRow testId="about-formats-cards">
              {formatCards.map((format) => (
                <article key={format.title} className="glass-card p-6 md:p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                    <FormatIcon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-display text-[1.65rem] font-semibold text-foreground">
                    {format.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {format.description}
                  </p>
                  <div className="mt-5 space-y-2 text-sm leading-6 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Melhor para:</span>{' '}
                      {format.goodFor}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Evite se:</span> {format.avoid}
                    </p>
                  </div>
                </article>
              ))}
            </EvidenceCardRow>

            <article className="glass-card mt-4 p-5 md:p-6">
              <p className="section-label mb-3">Automático</p>
              <h3 className="font-display text-[1.65rem] font-semibold text-foreground">
                Deixe no automático quando não quiser decidir manualmente
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Esse modo existe para reduzir dúvida. O arquivo é lido e a saída é escolhida sem te
                empurrar detalhe técnico.
              </p>
            </article>
          </ContentBandSection>
        </section>

        <PageCTA
          label="FAQ"
          title="Se restou dúvida, vá direto às respostas curtas"
          description="A página de FAQ concentra perguntas frequentes e também o tópico de privacidade."
          linkTo="/faq"
          linkLabel="Abrir FAQ"
        />
      </div>
    </div>
  );
}
