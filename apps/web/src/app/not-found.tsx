import Link from 'next/link';
import { Button } from '@/components/Button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-content flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-5xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink-100">This path does not verify</h1>
      <p className="mt-3 max-w-md text-sm text-ink-400">
        No page exists at this address. The proof tools are all one click away.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/merkle">
          <Button>Open Merkle Explorer</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Back home</Button>
        </Link>
      </div>
    </div>
  );
}
