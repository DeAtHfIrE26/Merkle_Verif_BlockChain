import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export type Verdict = 'valid' | 'invalid' | 'idle';

/**
 * The verification result surface.
 *
 * Colour alone never carries the verdict: each state also has a distinct icon
 * and an explicit word ("Valid" / "Invalid"), so it survives greyscale and
 * colour-vision deficiency. The region is aria-live so screen readers hear the
 * outcome without moving focus.
 */
export function VerdictPanel({
  verdict,
  title,
  detail,
  children,
}: {
  verdict: Verdict;
  title: string;
  detail?: string | null;
  children?: ReactNode;
}) {
  const styles = {
    valid: 'border-valid-border bg-valid-muted',
    invalid: 'border-invalid-border bg-invalid-muted',
    idle: 'border-ink-700 bg-ink-900',
  }[verdict];

  const textTone = {
    valid: 'text-valid-text',
    invalid: 'text-invalid-text',
    idle: 'text-ink-400',
  }[verdict];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-xl border p-4 transition-colors',
        styles,
        verdict !== 'idle' && 'animate-pop-in',
      )}
    >
      <div className="flex items-start gap-3">
        <VerdictIcon verdict={verdict} />
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold', textTone)}>{title}</p>
          {detail ? <p className="mt-1 text-xs text-ink-400">{detail}</p> : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  const common = 'mt-0.5 h-5 w-5 shrink-0';
  if (verdict === 'valid') {
    return (
      <svg className={cn(common, 'text-valid')} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 10.5l2.5 2.5L14 7.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (verdict === 'invalid') {
    return (
      <svg
        className={cn(common, 'text-invalid')}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 7l6 6M13 7l-6 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={cn(common, 'text-ink-500')} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}
