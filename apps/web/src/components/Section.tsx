import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-widest text-brand-text">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-100 sm:text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">{description}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn('card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-100">{title}</h2>
          {description ? <p className="mt-1 text-xs text-ink-400">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
