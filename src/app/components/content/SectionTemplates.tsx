import type { ReactNode } from 'react';
import { cn } from '../../utils/ui';

interface ContentHeroSectionProps {
  copy: ReactNode;
  visual: ReactNode;
  layout?: 'split' | 'stacked';
  className?: string;
  copyClassName?: string;
  visualClassName?: string;
  testId?: string;
}

export function ContentHeroSection({
  copy,
  visual,
  layout = 'split',
  className,
  copyClassName,
  visualClassName,
  testId
}: ContentHeroSectionProps) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'content-hero hero-orbit relative overflow-hidden',
        layout === 'split' ? 'editorial-section' : 'content-hero-stacked',
        className
      )}
    >
      <div className={cn('editorial-copy', copyClassName)}>{copy}</div>
      {visual ? <div className={cn('content-hero-visual', visualClassName)}>{visual}</div> : null}
    </section>
  );
}

interface ContentBandSectionProps {
  kicker: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  centered?: boolean;
  className?: string;
  bodyClassName?: string;
  testId?: string;
}

export function ContentBandSection({
  kicker,
  title,
  description,
  aside,
  children,
  centered,
  className,
  bodyClassName,
  testId
}: ContentBandSectionProps) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'content-band deferred-section glass-panel p-6 md:p-8',
        centered && 'content-band-centered',
        className
      )}
    >
      <div
        className={cn(
          'content-band-header grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]',
          !aside && 'lg:grid-cols-1'
        )}
      >
        <div className={cn('content-band-copy', bodyClassName)}>
          <p className="section-label mb-3">{kicker}</p>
          <h2 className="font-display text-3xl font-bold text-foreground">{title}</h2>
          <div className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            {description}
          </div>
        </div>
        {aside ? <div className="content-band-aside">{aside}</div> : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

interface EvidenceCardRowProps {
  children: ReactNode;
  className?: string;
  columnsClassName?: string;
  testId?: string;
}

export function EvidenceCardRow({
  children,
  className,
  columnsClassName = 'lg:grid-cols-3',
  testId
}: EvidenceCardRowProps) {
  return (
    <div
      data-testid={testId}
      className={cn('evidence-card-row grid gap-4', columnsClassName, className)}
    >
      {children}
    </div>
  );
}

interface IllustrationFrameProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

export function IllustrationFrame({ children, className, testId }: IllustrationFrameProps) {
  return (
    <div
      data-testid={testId}
      className={cn('illustration-frame glass-panel overflow-hidden p-5 md:p-6', className)}
    >
      {children}
    </div>
  );
}
