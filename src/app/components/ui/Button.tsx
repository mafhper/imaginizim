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
  hero: 'bg-primary text-primary-foreground transition-all duration-300 hover:brightness-110 shadow-sm',
  'hero-outline':
    'border border-primary/20 bg-primary/5 text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/10',
  nav: 'bg-transparent text-muted-foreground transition-all duration-200 hover:bg-white/[0.04] hover:text-foreground',
  'nav-active':
    'bg-white/[0.06] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  ghost:
    'bg-transparent text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground',
  outline:
    'border border-border/40 bg-background/60 text-foreground transition-colors hover:bg-white/[0.03]'
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 rounded-full px-4 text-[13px]',
  md: 'h-10 rounded-full px-5 text-sm',
  lg: 'h-12 rounded-full px-8 text-base',
  icon: 'h-10 w-10 rounded-full'
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
