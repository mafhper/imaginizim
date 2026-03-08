import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/ui';

type Variant = 'hero' | 'hero-outline' | 'nav' | 'nav-active' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  hero: 'btn-hero border border-primary/20 bg-gradient-to-r from-primary/90 via-[hsl(182,58%,52%)] to-[hsl(194,56%,56%)] text-primary-foreground shadow-[0_10px_36px_rgba(19,211,193,0.18)] transition-all duration-300 hover:brightness-[1.04] hover:shadow-[0_14px_42px_rgba(19,211,193,0.24)]',
  'hero-outline':
    'btn-hero-outline border border-primary/24 bg-primary/8 text-foreground transition-all duration-300 hover:border-primary/34 hover:bg-primary/12',
  nav: 'btn-nav bg-transparent text-muted-foreground transition-all duration-200 hover:bg-white/[0.04] hover:text-foreground',
  'nav-active':
    'btn-nav-active bg-white/[0.06] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  ghost:
    'btn-ghost bg-transparent text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground',
  outline:
    'btn-outline border border-input bg-background/60 text-foreground transition-colors hover:bg-white/[0.03]'
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 rounded-[8px] px-3 text-sm',
  md: 'h-10 rounded-[8px] px-4 text-sm',
  lg: 'h-11 rounded-[8px] px-8 text-sm',
  icon: 'h-10 w-10 rounded-[8px]'
};

export function Button({
  className,
  variant = 'hero',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
