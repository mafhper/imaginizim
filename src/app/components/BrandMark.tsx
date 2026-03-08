import logoDark from '../../assets/logo-imaginizim-dark.svg';
import logoLight from '../../assets/logo-imaginizim-light.svg';

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <picture>
        <source media="(prefers-color-scheme: light)" srcSet={logoLight} />
        <img src={logoDark} alt="" aria-hidden="true" className="h-8 w-8 rounded-[8px]" />
      </picture>
      {!compact ? (
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          IMAGINIZIM
        </span>
      ) : null}
    </span>
  );
}
