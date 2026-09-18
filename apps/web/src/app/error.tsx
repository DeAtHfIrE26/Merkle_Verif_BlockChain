'use client';

import { useEffect } from 'react';
import { Button } from '@/components/Button';

/**
 * Route-level error boundary. Recoverable by design: the tools hold no server
 * state, so re-rendering is almost always enough.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Surfaced for local debugging; there is no telemetry backend to report to.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-content flex-col items-center px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-semibold text-ink-100">Something broke on this page</h1>
      <p className="mt-3 max-w-md text-sm text-ink-400">
        No data was lost — every tool here computes locally and holds nothing on a server.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
