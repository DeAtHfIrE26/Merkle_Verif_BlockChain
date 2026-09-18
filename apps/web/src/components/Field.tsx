'use client';

import { cn } from '@/lib/cn';
import { useId, type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

/**
 * Labelled text input with inline validation.
 *
 * The label is a real <label for>, the hint and error are wired through
 * aria-describedby, and the error is announced politely rather than stealing
 * focus mid-typing.
 */
export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-ink-300">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? hintId : '', error ? errorId : '').trim() || undefined}
        className={cn(
          'w-full rounded-lg border bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100',
          'placeholder:text-ink-500 transition-colors',
          error ? 'border-invalid-border' : 'border-ink-700 hover:border-ink-600',
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-2xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-2xs text-invalid-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-ink-300">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? hintId : '', error ? errorId : '').trim() || undefined}
        className={cn(
          'w-full resize-y rounded-lg border bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100',
          'placeholder:text-ink-500 transition-colors',
          error ? 'border-invalid-border' : 'border-ink-700 hover:border-ink-600',
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-2xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-2xs text-invalid-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
