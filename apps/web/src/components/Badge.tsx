import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'valid' | 'invalid' | 'warn';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-800 text-ink-300 border-ink-600',
  brand: 'bg-brand-muted text-brand-text border-brand-border',
  valid: 'bg-valid-muted text-valid-text border-valid-border',
  invalid: 'bg-invalid-muted text-invalid-text border-invalid-border',
  warn: 'bg-warn-muted text-warn-text border-warn-border',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
