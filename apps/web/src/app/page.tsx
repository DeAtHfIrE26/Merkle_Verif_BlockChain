import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { HeroTree } from '@/components/HeroTree';

const TOOLS = [
  {
    href: '/merkle',
    title: 'Merkle Proof Explorer',
    description:
      'Build a tree from any set of values, pull an inclusion proof for any leaf, then tamper with it and watch verification fail.',
    accent: 'Inclusion proofs',
  },
  {
    href: '/signatures',
    title: 'Signature Verifier',
    description:
      'Sign with a throwaway key generated in your browser and recover the signer — with EIP-191 and raw modes side by side.',
    accent: 'ECDSA recovery',
  },
  {
    href: '/transfers',
    title: 'Transfer Tracker',
    description:
      'A token transfer feed rendered from simulated data, shown next to the subgraph query a live deployment would run.',
    accent: 'Simulated',
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-content px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0 animate-fade-up">
            <Badge tone="brand">
              <span aria-hidden="true">●</span> No wallet, no sign-up, nothing to install
            </Badge>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-100 sm:text-5xl">
              Prove a thing belongs
              <span className="block text-brand-text">without trusting anyone.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300">
              A Merkle proof shows one transaction is inside a block using a handful of hashes
              instead of the whole block. This toolkit builds those proofs, verifies them, and
              breaks them on purpose so you can see exactly what they guarantee.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-400">
              Every computation runs locally in your browser — and is cross-checked against the
              same verification logic written in Solidity, by a differential test suite that runs
              on every commit.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/merkle">
                <Button size="md">Open the Explorer</Button>
              </Link>
              <Link href="/about">
                <Button variant="secondary" size="md">
                  How it works
                </Button>
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-700 pt-6">
              {[
                ['226', 'automated tests'],
                ['0', 'credentials needed'],
                ['100%', 'client-side'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block font-mono text-xl font-semibold text-ink-100">
                      {value}
                    </span>
                    <span className="mt-0.5 block text-2xs uppercase tracking-wider text-ink-500">
                      {label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="min-w-0 animate-fade-up [animation-delay:120ms]">
            <HeroTree />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 pb-8 sm:px-6">
        <h2 className="sr-only">Tools</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="card group flex h-full flex-col p-5 transition-colors hover:border-ink-600 hover:bg-ink-800/60"
              >
                <span className="text-2xs font-semibold uppercase tracking-widest text-brand-text">
                  {tool.accent}
                </span>
                <span className="mt-3 text-base font-semibold text-ink-100">{tool.title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-400">
                  {tool.description}
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-text">
                  Open
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 3.5L10.5 8 6 12.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
