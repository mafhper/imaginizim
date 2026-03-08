import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getProjectMeta } from '../../utils/projectMeta';
import { ChevronDownIcon } from '../components/icons/AppIcons';
import { ShieldIcon } from '../components/icons/StepIcons';

const faqs = [
  {
    question: 'Posso usar em assets de produção?',
    answer:
      'Sim. O fluxo foi pensado para uso real em times web, com compressão local e comparação sob demanda apenas quando ela ajuda a decidir.'
  },
  {
    question: 'Funciona offline?',
    answer:
      'Depois do carregamento inicial, o processamento principal roda localmente. O resultado final depende do cache e do suporte do navegador ao codec escolhido.'
  },
  {
    question: 'Vai existir versão desktop?',
    answer: 'Sim. A base atual está sendo mantida para reaproveitamento em uma casca Tauri.'
  },
  {
    question: 'Como funciona a comparação?',
    answer:
      'A comparação abre em modal. Split mostra lado a lado e Mistura ajusta a imagem otimizada sobre a original.'
  }
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="glass-card transition-colors hover:border-primary/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="font-medium text-foreground">{question}</span>
        <ChevronDownIcon
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="border-t border-border/70 px-5 py-4">
          <p className="text-sm leading-7 text-muted-foreground">{answer}</p>
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
      <div className="site-shell space-y-10 md:space-y-16">
        <section data-testid="faq-hero" className="mx-auto max-w-3xl text-center">
          <p className="section-label mb-3">FAQ</p>
          <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Respostas curtas para dúvidas comuns
          </h1>
          <p className="hero-copy-lead mt-4 text-lg leading-8 text-muted-foreground">
            Se você quer saber se pode usar em produção, se funciona offline ou como a comparação
            entra no fluxo, começa por aqui.
          </p>
        </section>

        <section className="deferred-section mx-auto max-w-4xl space-y-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </section>

        <section id="privacidade" data-testid="faq-privacy-topic" className="mx-auto max-w-4xl">
          <article className="glass-card p-6 md:p-7">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                <ShieldIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="section-label mb-2">Privacidade</p>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Seus arquivos ficam no navegador
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  O arquivo entra, a compressão roda localmente e o download volta para você sem
                  criar uma etapa escondida no caminho.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                'Sem conta obrigatória para começar a usar',
                'Sem fila remota escondida no fluxo',
                'Sem upload para terceiros durante a compressão'
              ].map((item) => (
                <div
                  key={item}
                  className="illustration-card px-4 py-4 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="deferred-section mx-auto max-w-4xl">
          <article className="glass-card p-6 md:p-7">
            <p className="section-label mb-3">Suporte</p>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Não encontrou sua resposta?
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Abra uma issue com uma imagem de exemplo e o resultado esperado. Isso ajuda a tratar o
              caso certo sem trocar mensagens genéricas.
            </p>
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground"
            >
              Abrir issue no GitHub →
            </a>
          </article>
        </section>
      </div>
    </div>
  );
}
