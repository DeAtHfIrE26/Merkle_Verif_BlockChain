import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/Section';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'How Merkle inclusion proofs and ECDSA signer recovery work, and how this project verifies its TypeScript against its Solidity.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Background"
        title="How it works"
        description="Two ideas carry most of this toolkit: proving membership without revealing the whole set, and proving authorship without revealing a key."
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-ink-100">Merkle inclusion proofs</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Hash every item in a set. Pair the hashes up and hash each pair. Repeat until one hash
            remains — the <strong className="font-medium text-ink-100">root</strong>. Because every
            level depends on the one below it, changing any item anywhere changes the root.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            To prove one item is in the set, you do not need the set. You need the sibling hash at
            each level on the way up — about{' '}
            <span className="font-mono text-ink-100">log₂(n)</span> hashes. For a block of 4,096
            transactions that is 12 hashes instead of 4,096.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            This project uses <strong className="font-medium text-ink-100">sorted pairs</strong>:
            the two children are concatenated in ascending byte order before hashing. That means a
            proof carries no left/right flags, which keeps on-chain verification cheap.
          </p>
          <div className="mt-4 rounded-xl border border-warn-border bg-warn-muted p-4">
            <p className="text-xs leading-relaxed text-warn-text">
              <strong className="font-semibold">The catch worth knowing.</strong> Leaves and
              internal nodes are both 32 bytes, so an internal node can be presented as if it were
              a leaf and will verify. If leaf data must be unforgeable, hash it twice. The Explorer
              warns you when a value you are proving is really an internal node.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100">Signer recovery, and the prefix</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            An Ethereum signature does not say who signed it. Given the signature and the data that
            was signed, <span className="font-mono text-ink-100">ecrecover</span> reconstructs the
            signer&rsquo;s address. Matching that against who you expected is the verification.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            The trap is <em>what</em> was signed. Wallets never sign raw bytes — they prepend{' '}
            <span className="font-mono text-ink-100">
              &quot;\x19Ethereum Signed Message:\n32&quot;
            </span>{' '}
            first, so a signature can never be silently reused as a transaction. Recovery must
            apply the same prefix.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Get it wrong and nothing errors. Recovery still returns an address — just a stranger&rsquo;s.
            An earlier version of this project&rsquo;s contract recovered the raw digest while its
            tests signed with the prefix, so its only real test failed while three others passed by
            asserting <span className="font-mono text-ink-100">false</span> against a contract that
            returned <span className="font-mono text-ink-100">false</span> for everything.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100">Keeping two implementations honest</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            The same Merkle logic exists twice here: TypeScript that runs in your browser, and
            Solidity that would run on-chain. If they ever disagreed, this app would show a proof
            as valid that the chain rejects.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            So they are pinned together by a differential test suite. It builds randomised trees
            across 17 shapes — powers of two, odd counts that force node promotion, primes — and
            asserts both implementations agree on every leaf, every tampered proof, every foreign
            leaf, and truncated and extended proofs alike.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100">What runs where</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-300">
            {[
              ['Merkle Explorer', 'Entirely in your browser. No network calls.'],
              ['Signature Verifier', 'Entirely in your browser. Keys never leave the page.'],
              ['Transfer Tracker', 'Simulated data, generated locally and labelled as such.'],
              ['Contracts', 'Compiled and tested in CI; not deployed to a live network.'],
            ].map(([what, where]) => (
              <li key={what} className="flex flex-col gap-0.5 border-l-2 border-ink-700 pl-4">
                <span className="text-xs font-semibold text-ink-100">{what}</span>
                <span className="text-xs text-ink-400">{where}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-ink-700 pt-8">
          <Link href="/merkle">
            <Button>Try the Explorer</Button>
          </Link>
          <a
            href="https://github.com/DeAtHfIrE26/Merkle_Verif_BlockChain"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">Read the source</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
