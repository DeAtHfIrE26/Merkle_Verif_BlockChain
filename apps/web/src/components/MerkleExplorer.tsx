'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  buildEncodedTree,
  getProof,
  isInternalNode,
  LEAF_ENCODINGS,
  LeafEncodingError,
  leafEncodingInfo,
  MerkleError,
  normalizeHex,
  processProof,
  SAMPLE_TX_HASHES,
  SAMPLE_TX_LABELS,
  splitHexList,
  truncateHex,
  verifyProof,
  type EncodedLeaf,
  type Hex,
  type LeafEncoding,
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
import {
  decodeShareState,
  getSearchSnapshot,
  getServerSearchSnapshot,
  shareUrl,
  subscribeToSearch,
  type ShareState,
} from '@/lib/share';
import { cn } from '@/lib/cn';

/** Above this, the SVG stops being readable and we render summary stats only. */
const MAX_VISUALISED_LEAVES = 128;
/** Guard against someone pasting a novel into the textarea. */
const MAX_LEAVES = 4096;

const SAMPLE_INPUT = SAMPLE_TX_HASHES.join('\n');

/**
 * An allowlist shaped the way the address/amount encodings expect. Addresses
 * are obviously synthetic so nobody mistakes them for real holders.
 */
const SAMPLE_ALLOWLIST = [
  '0xA1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2, 1000',
  '0xB2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3, 2500',
  '0xC3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4, 750',
  '0xD4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5, 12000',
  '0xE5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6, 300',
].join('\n');

/** The starting point that makes sense for each encoding. */
const SAMPLE_FOR: Record<LeafEncoding, string> = {
  raw: SAMPLE_INPUT,
  packed: SAMPLE_ALLOWLIST,
  standard: SAMPLE_ALLOWLIST,
};

/** The human label for a sample hash, when the value is one of them. */
function sampleLabelFor(value: string): string | null {
  const i = SAMPLE_TX_HASHES.indexOf(value.trim().toLowerCase() as Hex);
  return i === -1 ? null : (SAMPLE_TX_LABELS[i] ?? null);
}

type BuildState =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tree: MerkleTree; leaves: readonly EncodedLeaf[] };

/**
 * Reads any shared tree out of the URL, then mounts the Explorer seeded with
 * it. The `key` means a shared link -- or a back/forward navigation -- starts a
 * clean Explorer rather than trying to reconcile two sets of state.
 */
export function MerkleExplorer() {
  const search = useSyncExternalStore(
    subscribeToSearch,
    getSearchSnapshot,
    getServerSearchSnapshot,
  );
  const shared = useMemo(() => decodeShareState(search), [search]);
  return <Explorer key={search} shared={shared} />;
}

function Explorer({ shared }: { shared: Partial<ShareState> }) {
  const [input, setInput] = useState(shared.values ?? SAMPLE_INPUT);
  const [encoding, setEncoding] = useState<LeafEncoding>(shared.encoding ?? 'raw');
  const [selected, setSelected] = useState(shared.index ?? 0);
  const [tamperedProof, setTamperedProof] = useState<string | null>(null);
  const [copied, setCopied] = useState<'proof' | 'link' | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

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
      const { tree, leaves } = buildEncodedTree(values, encoding);
      return { status: 'ready', tree, leaves };
    } catch (error) {
      if (error instanceof LeafEncodingError) {
        return { status: 'error', message: error.message };
      }
      return {
        status: 'error',
        message: error instanceof MerkleError ? error.message : 'Could not build a tree.',
      };
    }
  }, [input, encoding]);

  const tree = build.status === 'ready' ? build.tree : null;
  const leaves = build.status === 'ready' ? build.leaves : [];
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
    // processProof rejects malformed elements by throwing, and the proof box is
    // freely editable, so the computed root is best-effort for display only.
    let computedRoot: string | null;
    try {
      computedRoot = processProof(leaf, activeProof);
    } catch {
      computedRoot = null;
    }
    return { ok, computedRoot };
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

  const copy = useCallback(async (what: 'proof' | 'link', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard access can be refused; say nothing rather than assert success.
      setCopied(null);
    }
  }, []);

  // Switching encoding while the box still holds an untouched sample swaps in
  // the sample that fits, rather than dropping the visitor onto a parse error.
  const changeEncoding = useCallback(
    (next: LeafEncoding) => {
      setEncoding((current) => {
        setInput((text) => (text === SAMPLE_FOR[current] ? SAMPLE_FOR[next] : text));
        return next;
      });
      setSelected(0);
      reset();
    },
    [reset],
  );

  const copyProof = useCallback(() => {
    void copy('proof', JSON.stringify(activeProof, null, 2));
  }, [copy, activeProof]);

  const copyLink = useCallback(() => {
    const url = shareUrl({ values: input, encoding, index: safeIndex });
    if (url === null) {
      setShareError('This tree is too large to fit in a shareable link.');
      window.setTimeout(() => setShareError(null), 4000);
      return;
    }
    setShareError(null);
    // Only on an explicit share. Mirroring every keystroke would turn the
    // address bar into several hundred characters just for visiting the page,
    // and replaceState does not fire popstate, so this cannot feed back into
    // the store the shell reads.
    window.history.replaceState(null, '', url);
    void copy('link', url);
  }, [copy, input, encoding, safeIndex]);

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Inclusion proofs"
        title="Merkle Proof Explorer"
        description="A Merkle proof shows that one value belongs to a set, using only a handful of sibling hashes instead of the whole set. Build a tree below, pick a leaf, then break its proof on purpose."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={copyLink}>
              {copied === 'link' ? 'Link copied' : 'Share this tree'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setInput(SAMPLE_FOR[encoding])}>
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

      {shareError ? (
        <p role="status" className="mb-4 text-xs text-warn-text">
          {shareError}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 space-y-5 lg:order-none">
          <Panel
            title="Leaf values"
            description="One per line. How each line becomes a leaf is up to the encoding below."
          >
            <EncodingPicker value={encoding} onChange={changeEncoding} />
            <TextAreaField
              label="Values"
              rows={10}
              value={input}
              spellCheck={false}
              onChange={(e) => {
                setInput(e.target.value);
                reset();
              }}
              placeholder={leafEncodingInfo(encoding).placeholder}
              hint={
                build.status === 'ready'
                  ? `${leafCount} ${leafCount === 1 ? 'leaf' : 'leaves'} · ${tree!.layers.length} ${tree!.layers.length === 1 ? 'layer' : 'layers'}${leafEncodingInfo(encoding).reorders ? ' · ordered by hash, not by line' : ''}`
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
                    {leaves[safeIndex]?.value}
                  </dd>
                  {sampleLabelFor(leaves[safeIndex]?.value ?? '') ? (
                    <p className="mt-1 text-2xs text-ink-500">
                      {sampleLabelFor(leaves[safeIndex]?.value ?? '')}
                    </p>
                  ) : null}
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

        <div className="order-1 min-w-0 space-y-5 lg:order-none">
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={copyProof}
                      disabled={activeProof.length === 0}
                    >
                      {copied === 'proof' ? 'Copied' : 'Copy proof'}
                    </Button>
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
                            <dd className="min-w-0 break-all font-mono text-ink-300">
                              {truncateHex(tree!.root, 14, 10)}
                            </dd>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <dt className="w-28 shrink-0 text-ink-500">Computed root</dt>
                            <dd className="min-w-0 break-all font-mono text-invalid-text">
                              {verdict.computedRoot
                                ? truncateHex(verdict.computedRoot, 14, 10)
                                : 'not computable — a proof element is not 32 bytes'}
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

/**
 * Leaf encoding chooser.
 *
 * Each option shows its formula verbatim, because the only way to know which
 * one you need is to match it against the line in your contract that hashes
 * the leaf.
 */
function EncodingPicker({
  value,
  onChange,
}: {
  value: LeafEncoding;
  onChange: (next: LeafEncoding) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-2xs uppercase tracking-wider text-ink-500">
        Leaf encoding
      </legend>
      <div className="space-y-2">
        {LEAF_ENCODINGS.map((option) => {
          const active = option.id === value;
          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer gap-2.5 rounded-lg border p-2.5 transition-colors',
                active
                  ? 'border-brand-border bg-brand-muted'
                  : 'border-ink-700 bg-ink-900 hover:border-ink-600',
              )}
            >
              <input
                type="radio"
                name="leaf-encoding"
                value={option.id}
                checked={active}
                onChange={() => onChange(option.id)}
                className="mt-0.5 shrink-0 accent-brand"
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-ink-100">{option.label}</span>
                <span className="mt-0.5 block text-2xs text-ink-400">{option.hint}</span>
                <code className="mt-1 block break-all font-mono text-2xs text-ink-500">
                  {option.formula}
                </code>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
