import logoDark from '../../assets/logo-imaginizim-dark.svg';
import logoLight from '../../assets/logo-imaginizim-light.svg';

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Official "iZ" Icon Logo */}
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl shadow-sm">
        <img src={logoLight} alt="iZ" className="absolute inset-0 h-full w-full dark:opacity-0 transition-opacity" />
        <img src={logoDark} alt="iZ" className="absolute inset-0 h-full w-full opacity-0 dark:opacity-100 transition-opacity" />
      </div>
      
      {/* Text Logo - Written as text, hidden when compact */}
      <div className={cn(
        "overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]",
        compact ? "w-0 opacity-0" : "w-[120px] opacity-100"
      )}>
        <span className="font-display text-base font-bold tracking-tight text-foreground whitespace-nowrap">
          IMAGINIZIM
        </span>
      </div>
    </span>
  );
}

import { cn } from '../utils/ui';
