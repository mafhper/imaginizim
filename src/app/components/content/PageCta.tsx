import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PageCtaProps {
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  label: string;
}

export function PageCta({ eyebrow, title, description, to, label }: PageCtaProps) {
  return (
    <section className="glass-panel mt-16 overflow-hidden p-6 md:p-8">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">{title}</h2>
          <p className="mt-3 max-w-[52ch] text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          to={to}
          className="inline-flex items-center gap-2 rounded-[8px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground transition-transform duration-200 hover:-translate-y-0.5"
        >
          {label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
