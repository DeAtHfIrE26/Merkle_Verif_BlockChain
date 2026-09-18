'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  buildMerkleTree,
  getProof,
  hashLeaf,
  isInternalNode,
  MerkleError,
  normalizeHex,
  processProof,
  SAMPLE_TX_HASHES,
  SAMPLE_TX_LABELS,
  splitHexList,
  truncateHex,
  verifyProof,
  type Hex,
  type MerkleTree,
} from '@merkle-verify/core';
import { Badge } from './Badge';
import { Button } from './Button';
import { Hex as HexValue } from './Hex';
import { MerkleTreeView, TreeLegend } from './MerkleTreeView';
import { PageHeader, Panel } from './Section';
import { TextAreaField } from './Field';
import { VerdictPanel } from './VerdictPanel';
import { onChainEnabled, merkleVerifierAddress } from '@/lib/config';

/** Above this, the SVG stops being readable and we render summary stats only. */
const MAX_VISUALISED_LEAVES = 128;
/** Guard against someone pasting a novel into the textarea. */
const MAX_LEAVES = 4096;

const SAMPLE_INPUT = SAMPLE_TX_HASHES.map(
  (hash, i) => `${hash}  # ${SAMPLE_TX_LABELS[i] ?? ''}`.trimEnd(),
).join('\n');

type BuildState =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tree: MerkleTree; values: string[] };

export function MerkleExplorer() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [selected, setSelected] = useState(0);
  const [tamperedProof, setTamperedProof] = useState<string | null>(null);

  const build = useMemo<BuildState>(() => {
    // Strip trailing `# comment` so the sample's labels are ignored.
    const values = input
      .split('\n')
      .map((line) => line.split('#')[0]!.trim())
      .filter((line) => line.length > 0);

    if (values.length === 0) return { status: 'empty' };
    if (values.length > MAX_LEAVES) {
      return {
        status: 'error',
        message: `That is ${values.length.toLocaleString()} leaves. The explorer caps at ${MAX_LEAVES.toLocaleString()} to stay responsive.`,
      };
    }

    try {
      return { status: 'ready', tree: buildMerkleTree(values.map(hashLeaf)), values };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof MerkleError ? error.message : 'Could not build a tree.',
      };
    }
  }, [input]);

  const tree = build.status === 'ready' ? build.tree : null;
  const values = build.status === 'ready' ? build.values : [];
  const leafCount = tree?.leaves.length ?? 0;
  const safeIndex = tree ? Math.min(selected, leafCount - 1) : 0;

  const canonicalProof = useMemo(
    () => (tree ? getProof(tree, safeIndex) : []),
    [tree, safeIndex],
  );

  const activeProof = useMemo(() => {
    if (tamperedProof === null) return canonicalProof;
    return splitHexList(tamperedProof)
      .map((p) => normalizeHex(p))
      .filter((p): p is Hex => p !== null);
  }, [tamperedProof, canonicalProof]);

  const leaf = tree?.leaves[safeIndex] ?? null;

  const verdict = useMemo(() => {
    if (!tree || !leaf) return null;
    const ok = verifyProof(leaf, activeProof, tree.root);
    return { ok, computedRoot: processProof(leaf, activeProof) };
  }, [tree, leaf, activeProof]);

  const isTampered = tamperedProof !== null;

  const tamper = useCallback(() => {
    if (canonicalProof.length === 0) return;
    // Flip the last hex digit of the first proof element — a minimal, obvious
    // change that makes the point without looking like random noise.
    const first = canonicalProof[0]!;
    const lastChar = first.slice(-1);
    const flipped = `${first.slice(0, -1)}${lastChar === '0' ? '1' : '0'}`;
    setTamperedProof([flipped, ...canonicalProof.slice(1)].join(',\n'));
  }, [canonicalProof]);

  const reset = useCallback(() => setTamperedProof(null), []);

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Inclusion proofs"
        title="Merkle Proof Explorer"
        description="A Merkle proof shows that one value belongs to a set, using only a handful of sibling hashes instead of the whole set. Build a tree below, pick a leaf, then break its proof on purpose."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInput(SAMPLE_INPUT)}>
              Load sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput('');
                reset();
              }}
            >
              Clear
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel
            title="Leaf values"
            description="One per line. Hex is hashed by its bytes; anything else as UTF-8."
          >
            <TextAreaField
              label="Values"
              rows={10}
              value={input}
              spellCheck={false}
              onChange={(e) => {
                setInput(e.target.value);
                reset();
              }}
              placeholder={'0xabc…\nalice@example.com\nany string works'}
              hint={
                build.status === 'ready'
                  ? `${leafCount} ${leafCount === 1 ? 'leaf' : 'leaves'} · ${tree!.layers.length} ${tree!.layers.length === 1 ? 'layer' : 'layers'}`
                  : 'Add at least one value to build a tree.'
              }
              error={build.status === 'error' ? build.message : null}
            />
          </Panel>

          {tree && leaf ? (
            <Panel
              title="Selected leaf"
              description={`Leaf ${safeIndex} of ${leafCount}`}
              actions={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Previous leaf"
                    disabled={safeIndex === 0}
                    onClick={() => {
                      setSelected((i) => Math.max(0, i - 1));
                      reset();
                    }}
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Next leaf"
                    disabled={safeIndex >= leafCount - 1}
                    onClick={() => {
                      setSelected((i) => Math.min(leafCount - 1, i + 1));
                      reset();
                    }}
                  >
                    →
                  </Button>
                </div>
              }
            >
              <dl className="space-y-3 text-xs">
                <div>
                  <dt className="mb-1 text-2xs uppercase tracking-wider text-ink-500">
                    Original value
                  </dt>
                  <dd className="break-all font-mono text-xs text-ink-300">
                    {values[safeIndex]}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-2xs uppercase tracking-wider text-ink-500">
                    Leaf hash
                  </dt>
                  <dd>
                    <HexValue value={leaf} label="Leaf hash" />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-2xs uppercase tracking-wider text-ink-500">
                    Merkle root
                  </dt>
                  <dd>
                    <HexValue value={tree.root} label="Merkle root" className="text-brand-text" />
                  </dd>
                </div>
              </dl>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          {build.status === 'empty' ? (
            <EmptyState onLoadSample={() => setInput(SAMPLE_INPUT)} />
          ) : build.status === 'error' ? (
            <Panel title="Tree">
              <p className="py-8 text-center text-sm text-ink-400">
                Fix the input to see the tree.
              </p>
            </Panel>
          ) : (
            <>
              <Panel
                title="Tree"
                description={
                  leafCount <= MAX_VISUALISED_LEAVES
                    ? 'Click any leaf to prove it. Green nodes are the proof.'
                    : undefined
                }
                actions={<Badge tone="neutral">{leafCount} leaves</Badge>}
              >
                {leafCount <= MAX_VISUALISED_LEAVES ? (
                  <>
                    <MerkleTreeView
                      tree={tree!}
                      leafIndex={safeIndex}
                      broken={isTampered && verdict?.ok === false}
                      onSelectLeaf={(i) => {
                        setSelected(i);
                        reset();
                      }}
                    />
                    <div className="mt-4 border-t border-ink-700 pt-3">
                      <TreeLegend broken={isTampered && verdict?.ok === false} />
                    </div>
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-ink-400">
                    Too many leaves to draw legibly — the proof below is still exact.
                    <br />
                    <span className="text-xs text-ink-500">
                      Visualisation is shown up to {MAX_VISUALISED_LEAVES} leaves.
                    </span>
                  </p>
                )}
              </Panel>

              <Panel
                title="Proof"
                description={`${activeProof.length} sibling ${activeProof.length === 1 ? 'hash' : 'hashes'} — enough to reach the root from this leaf.`}
                actions={
                  <div className="flex flex-wrap gap-2">
                    {isTampered ? (
                      <Button variant="secondary" size="sm" onClick={reset}>
                        Restore proof
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={tamper}
                        disabled={canonicalProof.length === 0}
                      >
                        Tamper with it
                      </Button>
                    )}
                  </div>
                }
              >
                {canonicalProof.length === 0 && !isTampered ? (
                  <p className="text-xs text-ink-400">
                    This tree has a single leaf, so the leaf <em>is</em> the root and the proof is
                    empty.
                  </p>
                ) : (
                  <TextAreaField
                    label="Proof elements (editable)"
                    rows={Math.min(6, Math.max(3, activeProof.length))}
                    spellCheck={false}
                    value={tamperedProof ?? canonicalProof.join(',\n')}
                    onChange={(e) => setTamperedProof(e.target.value)}
                    hint="Edit any character to see verification fail."
                  />
                )}

                {verdict ? (
                  <div className="mt-4">
                    <VerdictPanel
                      verdict={verdict.ok ? 'valid' : 'invalid'}
                      title={
                        verdict.ok
                          ? 'Valid — this leaf is in the tree'
                          : 'Invalid — this proof does not reach the root'
                      }
                      detail={
                        verdict.ok
                          ? `Folding the leaf through ${activeProof.length} sibling ${activeProof.length === 1 ? 'hash' : 'hashes'} reproduces the root exactly.`
                          : 'The recomputed root differs from the tree root, so the proof does not hold.'
                      }
                    >
                      {!verdict.ok ? (
                        <dl className="space-y-1.5 text-2xs">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <dt className="w-28 shrink-0 text-ink-500">Expected root</dt>
                            <dd className="font-mono text-ink-300">
                              {truncateHex(tree!.root, 14, 10)}
                            </dd>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <dt className="w-28 shrink-0 text-ink-500">Computed root</dt>
                            <dd className="font-mono text-invalid-text">
                              {truncateHex(verdict.computedRoot, 14, 10)}
                            </dd>
                          </div>
                        </dl>
                      ) : null}
                    </VerdictPanel>
                  </div>
                ) : null}

                {tree && leaf && isInternalNode(tree, leaf) ? (
                  <div className="mt-3 rounded-lg border border-warn-border bg-warn-muted p-3">
                    <p className="text-2xs leading-relaxed text-warn-text">
                      <strong className="font-semibold">Second-preimage note.</strong> This value
                      also appears as an internal node. In a sorted-pair tree, internal nodes are
                      the same 32 bytes as leaves, so one can be replayed as the other. Hash leaf
                      data twice if that matters for your use case.
                    </p>
                  </div>
                ) : null}
              </Panel>

              {onChainEnabled ? (
                <Panel
                  title="On-chain verification"
                  description="The same proof, checked by the deployed Solidity verifier."
                >
                  <p className="text-xs text-ink-400">
                    Contract{' '}
                    <span className="font-mono text-ink-300">
                      {truncateHex(merkleVerifierAddress!, 10, 8)}
                    </span>{' '}
                    is configured. Connect a wallet on the matching network to verify on-chain.
                  </p>
                </Panel>
              ) : (
                <p className="px-1 text-2xs leading-relaxed text-ink-500">
                  Everything above is computed in this browser. The identical logic exists in{' '}
                  <span className="font-mono">MerkleVerifier.sol</span>, and a differential test
                  suite asserts the two agree on every commit.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <svg viewBox="0 0 48 48" className="h-12 w-12 text-ink-600" fill="none" aria-hidden="true">
        <circle cx="24" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="30" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="36" cy="30" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M24 14v6m0 0l-9 6m9-6l9 6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <h2 className="mt-4 text-sm font-semibold text-ink-200">No tree yet</h2>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink-400">
        Add one value per line on the left — transaction hashes, email addresses, anything. Or
        start from the sample set.
      </p>
      <Button size="sm" className="mt-5" onClick={onLoadSample}>
        Load sample data
      </Button>
    </div>
  );
}
