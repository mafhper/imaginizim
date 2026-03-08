import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './icons/AppIcons';
import { Button } from './ui/Button';

interface PageCTAProps {
  label: string;
  title: string;
  description: string;
  linkTo: string;
  linkLabel: string;
}

export function PageCTA({ label, title, description, linkTo, linkLabel }: PageCTAProps) {
  return (
    <section className="page-cta deferred-section glass-panel mt-14 overflow-hidden p-5 md:mt-20 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(95,119,255,0.1),transparent_28%)]" />
      <div className="relative z-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="max-w-xl">
          <p className="section-label mb-3">{label}</p>
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        <Link to={linkTo}>
          <Button variant="hero" size="lg">
            {linkLabel}
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
