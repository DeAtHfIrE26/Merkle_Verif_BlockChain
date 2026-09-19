'use client';

import dynamic from 'next/dynamic';

/**
 * The workbench generates a keypair at first render, so it must run only in the
 * browser: a server pass would produce a different key and hydration would
 * disagree. Loading it client-only also gives a genuine loading state — the
 * skeleton below is shown while the chunk is fetched, not on a timer.
 */
const SignatureWorkbenchRoot = dynamic(
  () => import('./SignatureWorkbench').then((m) => m.SignatureWorkbenchRoot),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton mt-3 h-8 w-72 max-w-full" />
        <div className="skeleton mt-3 h-4 w-full max-w-2xl" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
          <div className="skeleton h-96 rounded-2xl" />
        </div>
        <span className="sr-only">Loading the signature workbench</span>
      </div>
    ),
  },
);

export function SignatureWorkbenchLoader() {
  return <SignatureWorkbenchRoot />;
}
