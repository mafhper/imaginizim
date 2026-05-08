import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getProjectMeta } from '../../utils/projectMeta';
import { BrowserIcon, ChevronDownIcon, GithubIcon } from '../components/icons/AppIcons';
import { ShieldIcon } from '../components/icons/StepIcons';
import { Button } from '../components/ui/Button';

const faqs = [
  {
    category: 'Uso',
    question: 'Posso usar em assets de produção?',
    answer:
      'Sim. O fluxo foi pensado para preparar assets web em lotes, com comparação apenas quando ela ajuda a decidir.'
  },
  {
    category: 'Local-first',
    question: 'Funciona offline?',
    answer:
      'Depois do carregamento inicial, o processamento principal roda localmente. O suporte final depende do cache e dos codecs disponíveis no navegador.'
  },
  {
    category: 'Roadmap',
    question: 'Vai existir versão desktop?',
    answer:
      'Sim. A base está sendo mantida para reaproveitar worker, formatos e comparação em uma casca Tauri.'
  },
  {
    category: 'Revisão',
    question: 'Como funciona a comparação?',
    answer:
      'A comparação abre em modal quando um arquivo já foi processado. Você pode revisar antes/depois e baixar o item individualmente.'
  },
  {
    category: 'Ajustes',
    question: 'Preciso escolher formato manualmente?',
    answer:
      'Não. O automático é o caminho padrão para lotes mistos. Formato, qualidade, escala e modo ficam disponíveis para quando o destino do asset exigir.'
  }
];

function FaqItem({
  category,
  question,
  answer
}: {
  category: string;
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="faq-row">
      <button
        type="button"
        className="faq-row__button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="faq-row__category">{category}</span>
        <span className="faq-row__question">{question}</span>
        <ChevronDownIcon
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="faq-row__answer">
          <p>{answer}</p>
        </div>
      ) : null}
    </article>
  );
}

export function FaqPage() {
  const issueUrl = getProjectMeta().issuesUrl;
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
    <div data-page="faq" className="py-14 md:py-24">
      <div className="site-shell space-y-10 md:space-y-14">
        <section data-testid="faq-hero" className="content-plain-hero">
          <div className="max-w-3xl">
            <p className="section-label mb-3">FAQ</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Respostas diretas para usar sem interromper o fluxo
            </h1>
            <p className="hero-copy-lead mt-5 text-lg leading-8 text-muted-foreground">
              Privacidade, formatos, comparação e roadmap ficam aqui para consulta rápida. O produto
              continua simples na hora de comprimir.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/">
              <Button variant="hero" size="sm">
                Abrir compressor
              </Button>
            </Link>
            <a href={issueUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="hero-outline" size="sm">
                <GithubIcon className="h-4 w-4" /> Reportar caso
              </Button>
            </a>
          </div>
        </section>

        <section className="faq-surface mx-auto max-w-5xl">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </section>

        <section id="privacidade" data-testid="faq-privacy-topic" className="privacy-band">
          <div className="privacy-band__icon">
            <ShieldIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="section-label mb-2">Privacidade</p>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Seus arquivos ficam no navegador
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              O arquivo entra, a compressão roda localmente e o resultado volta para você sem conta,
              servidor de fila ou upload escondido para terceiros.
            </p>
          </div>
          <div className="privacy-band__proof">
            {['Sem conta', 'Sem fila remota', 'Sem upload oculto'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="support-strip">
          <BrowserIcon className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Não encontrou sua resposta?
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Abra uma issue com imagem de exemplo, resultado esperado e navegador usado.
            </p>
          </div>
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="support-strip__link"
          >
            Abrir issue
          </a>
        </section>
      </div>
    </div>
  );
}
