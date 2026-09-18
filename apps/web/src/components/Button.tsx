import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-bright active:bg-brand disabled:hover:bg-brand shadow-sm shadow-brand/25',
  secondary: 'bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-600',
  ghost: 'bg-transparent text-ink-300 hover:bg-ink-800 hover:text-ink-100',
  danger: 'bg-invalid-muted text-invalid-text border border-invalid-border hover:bg-invalid/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
