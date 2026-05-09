import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { getProjectMeta } from '../../utils/projectMeta';
import { BrowserIcon, ChevronDownIcon, GithubIcon } from '../components/icons/AppIcons';
import { AnalyzeIcon, ExportIcon, ShieldIcon } from '../components/icons/StepIcons';
import { Button } from '../components/ui/Button';
import { BrandMark } from '../components/BrandMark';
import { cn } from '../utils/ui';

// AboutPage component internationalized with t() calls

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
    <article className="py-8 group">
      <button
        type="button"
        className="w-full flex items-start justify-between text-left focus:outline-none"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex-1 pr-8">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-3 block">
            {category}
          </span>
          <span className="font-display text-xl md:text-2xl font-normal tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight">
            {question}
          </span>
        </div>
        <div
          className={cn(
            'mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 transition-all duration-300',
            open
              ? 'bg-primary border-primary text-primary-foreground rotate-180'
              : 'bg-background text-muted-foreground group-hover:border-primary group-hover:text-primary'
          )}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-500 ease-in-out',
          open ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'
        )}
      >
        <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl">{answer}</p>
      </div>
    </article>
  );
}

// AboutPage component internationalized with t() calls

export function AboutPage() {
  const { t } = useTranslation();
  const issueUrl = getProjectMeta().issuesUrl;
  const location = useLocation();

  const flowSteps = [
    {
      title: t('how.step1_title'),
      description: t('how.step1_desc'),
      icon: BrowserIcon
    },
    {
      title: t('how.step2_title'),
      description: t('how.step2_desc'),
      icon: AnalyzeIcon
    },
    {
      title: t('how.step3_title'),
      description: t('how.step3_desc'),
      icon: ExportIcon
    }
  ];

  const faqs = [
    {
      category: t('nav.app'),
      question: t('faq.q1'),
      answer: t('faq.a1')
    },
    {
      category: 'Privacidade',
      question: t('faq.q2'),
      answer: t('faq.a2')
    },
    {
      category: 'Roadmap',
      question: t('faq.q3'),
      answer: t('faq.a3')
    }
  ];

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
    <div data-page="about" className="relative min-h-screen overflow-hidden py-14 md:py-24">
      <div className="container relative z-10 max-w-4xl space-y-32 md:space-y-48">
        {/* Hero Section */}
        <section data-testid="about-hero" className="max-w-3xl mx-auto text-center pt-8 md:pt-16">
          <h1 className="font-display text-4xl font-normal tracking-tight leading-[1.1] text-foreground md:text-[4rem]">
            {t('about.intro_title')}
          </h1>
          <p className="mt-10 text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            {t('about.intro_desc')}
          </p>
        </section>

        {/* Editorial Timeline */}
        <section id="fluxo" className="max-w-3xl mx-auto" data-testid="about-flow-band">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 md:gap-20">
            <div className="sticky top-32 h-fit">
              <h2 className="font-display text-3xl font-normal tracking-tight text-foreground leading-tight">
                {t('about.flow_title')}
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">{t('about.flow_desc')}</p>
            </div>

            <div className="space-y-20 border-l border-border/40 pl-8 md:pl-12 py-4">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute left-[-41px] md:left-[-57px] top-2 h-4 w-4 rounded-full bg-background border-2 border-primary group-hover:scale-125 transition-transform" />

                    <div className="flex items-center gap-3 mb-4 text-primary/60">
                      <span className="font-mono text-xs font-bold tracking-tighter">
                        0{index + 1}
                      </span>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-2xl font-normal tracking-tight text-foreground mb-4">
                      {step.title}
                    </h3>
                    <p className="text-lg leading-relaxed text-muted-foreground/90">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Editorial Privacy Block */}
        <section id="privacidade" data-testid="faq-privacy-topic" className="max-w-4xl mx-auto">
          <div className="glass-card relative overflow-hidden rounded-[24px] p-8 md:p-20 text-center border-border/60">
            <div className="relative z-10">
              <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-glow">
                <ShieldIcon className="h-10 w-10" />
              </div>
              <h2 className="font-display text-3xl font-normal tracking-tight text-foreground mb-6 md:text-4xl">
                {t('about.privacy_title')}
              </h2>
              <p className="text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto mb-12">
                {t('about.privacy_desc')}
              </p>
              <div className="flex flex-wrap justify-center gap-8 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-primary/70">
                <div className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>{t('privacy.boundary_title')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>{t('privacy.note')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section id="faq" className="max-w-3xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-normal tracking-tight text-foreground">
              {t('faq.title')}
            </h2>
            <p className="mt-4 text-muted-foreground">{t('faq.intro')}</p>
          </div>
          <div className="border-t border-border/40 divide-y divide-border/40">
            {faqs.map((faq) => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </div>
        </section>

        {/* Support Strip CTA */}
        <footer className="max-w-3xl mx-auto text-center border-t border-border/40 pt-24 pb-12">
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20 text-secondary">
            <BrowserIcon className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-normal tracking-tight text-foreground mb-4">
            {t('about.support_title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
            {t('about.support_desc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={issueUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="rounded-full px-8 h-12 border-border/60 hover:bg-secondary/10"
              >
                <GithubIcon className="h-5 w-5 mr-3" /> {t('faq.support_cta')}
              </Button>
            </a>
          </div>
          <div className="mt-20 opacity-30">
            <BrandMark className="mx-auto scale-75" />
          </div>
        </footer>
      </div>
    </div>
  );
}
