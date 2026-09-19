'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/merkle', label: 'Merkle Proofs' },
  { href: '/signatures', label: 'Signatures' },
  { href: '/transfers', label: 'Transfers' },
  { href: '/about', label: 'How it works' },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/80 backdrop-blur-lg">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded text-sm font-semibold text-ink-100"
        >
          <LogoMark />
          <span>Merkle Verify</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive(link.href)
                    ? 'bg-ink-800 text-ink-100'
                    : 'text-ink-400 hover:bg-ink-900 hover:text-ink-200',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/DeAtHfIrE26/Merkle_Verif_BlockChain"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100 sm:block"
          >
            GitHub
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 md:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open ? (
        <div id="mobile-menu" className="border-t border-ink-700/70 md:hidden">
          <ul className="mx-auto max-w-content px-4 py-2 sm:px-6">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive(link.href)
                      ? 'bg-ink-800 text-ink-100'
                      : 'text-ink-300 hover:bg-ink-900',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="#7C6BF5" strokeWidth="1.4" />
      <circle cx="12" cy="8" r="1.6" fill="#9E92FF" />
      <circle cx="8.5" cy="14.5" r="1.6" fill="#2DD4A7" />
      <circle cx="15.5" cy="14.5" r="1.6" fill="#2DD4A7" />
      <path d="M12 9.6v1.6m0 0l-3.5 2m3.5-2l3.5 2" stroke="#4A3FA8" strokeWidth="1.1" />
    </svg>
  );
}
