'use client';

import { useCallback, useState } from 'react';
import { truncateHex } from '@merkle-verify/core';
import { cn } from '@/lib/cn';

interface HexProps {
  value: string;
  /** Show an abbreviated form; the full value stays available via title/copy. */
  truncate?: boolean;
  className?: string;
  label?: string;
}

/**
 * Renders a hex value in monospace with a copy affordance.
 *
 * The full value is always in the DOM as the button's title and is what gets
 * copied, so truncation is purely visual and never loses information.
 */
export function Hex({ value, truncate = false, className, label }: HexProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be blocked by permissions or an insecure context; the
      // value is selectable either way, so this is not worth surfacing.
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      title={`${label ? `${label}: ` : ''}${value} (click to copy)`}
      aria-label={`Copy ${label ?? 'value'} ${value}`}
      className={cn(
        'group inline-flex max-w-full items-center gap-1.5 rounded px-1 py-0.5 font-mono text-xs',
        'text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100',
        className,
      )}
    >
      <span className={cn('min-w-0 truncate', truncate && 'shrink-0')}>
        {truncate ? truncateHex(value, 10, 8) : value}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 text-2xs transition-opacity',
          copied ? 'text-valid opacity-100' : 'text-ink-500 opacity-0 group-hover:opacity-100',
        )}
      >
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}
