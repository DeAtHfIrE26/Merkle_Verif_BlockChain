'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildMerkleTree, getProof, SAMPLE_TX_HASHES, truncateHex } from '@merkle-verify/core';
import { MerkleTreeView } from './MerkleTreeView';
import { Badge } from './Badge';

/**
 * Landing-page visual: a real tree built by the real library, cycling through
 * leaves so the proof path animates without the visitor touching anything.
 *
 * The cycle pauses when the tab is hidden and when the user prefers reduced
 * motion, in which case a single static path is shown instead.
 */
export function HeroTree() {
  const tree = useMemo(() => buildMerkleTree([...SAMPLE_TX_HASHES]), []);
  const [leafIndex, setLeafIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setLeafIndex((i) => (i + 1) % SAMPLE_TX_HASHES.length);
      }
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  const proof = getProof(tree, leafIndex);

  return (
    <div className="card overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-200">Inclusion proof</p>
          <p className="mt-0.5 text-2xs text-ink-500">
            Leaf {leafIndex} of {SAMPLE_TX_HASHES.length}
          </p>
        </div>
        <Badge tone="valid">
          {proof.length} {proof.length === 1 ? 'hash' : 'hashes'} needed
        </Badge>
      </div>

      <MerkleTreeView tree={tree} leafIndex={leafIndex} compact />

      <dl className="mt-4 space-y-1.5 border-t border-ink-700 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-2xs uppercase tracking-wider text-ink-500">Root</dt>
          <dd className="truncate font-mono text-2xs text-brand-text">
            {truncateHex(tree.root, 12, 10)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-2xs uppercase tracking-wider text-ink-500">Leaf</dt>
          <dd className="truncate font-mono text-2xs text-ink-300">
            {truncateHex(tree.leaves[leafIndex]!, 12, 10)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
