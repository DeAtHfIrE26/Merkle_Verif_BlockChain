'use client';

import { useMemo } from 'react';
import type { Hex, MerkleTree } from '@merkle-verify/core';
import { cn } from '@/lib/cn';

export interface TreeHighlight {
  /** Index of the leaf being proved, or null for none. */
  leafIndex: number | null;
  /** Mark the highlighted path as broken (renders rose instead of emerald). */
  broken?: boolean;
}

interface Props extends TreeHighlight {
  tree: MerkleTree;
  onSelectLeaf?: (index: number) => void;
  className?: string;
  /** Compact mode drops labels and shrinks nodes, for the landing hero. */
  compact?: boolean;
}

interface Node {
  layer: number;
  index: number;
  x: number;
  y: number;
  hash: string;
  role: 'root' | 'path' | 'proof' | 'plain';
}

/**
 * Renders a Merkle tree as an SVG, with the proof path for one leaf picked out.
 *
 * Roles drive the colour:
 *   path  — the leaf and its ancestors up to the root (violet, or rose when broken)
 *   proof — the siblings that make up the proof (emerald)
 *   plain — everything else
 *
 * The SVG scales via viewBox, so the same component serves the hero and the
 * full-width explorer. Leaves are real <button>s when selectable, so the tree
 * is keyboard navigable rather than mouse-only.
 */
export function MerkleTreeView({
  tree,
  leafIndex,
  broken = false,
  onSelectLeaf,
  className,
  compact = false,
}: Props) {
  const { nodes, edges, width, height, radius, leafAt } = useMemo(() => {
    const layerCount = tree.layers.length;
    const leafCount = tree.leaves.length;
    // Under the OpenZeppelin scheme leaves sit on two different layers, so the
    // widest layer -- not layer 0 -- decides how much room the drawing needs.
    const widest = tree.layers.reduce((max, layer) => Math.max(max, layer.length), 1);

    /**
     * How many slots a layer's nodes are spread across.
     *
     * The layered scheme fills every layer left to right, so spreading nodes
     * evenly across the layer is right. A complete binary tree does not: its
     * deepest layer may hold two nodes that both belong under the leftmost
     * parent. Spreading those evenly would fling them to the far corners and
     * draw edges across the whole picture, so each layer is instead laid out on
     * the 2^depth grid the tree actually has.
     */
    const slotsFor = (layer: readonly Hex[], l: number) =>
      tree.scheme === 'standard' ? 2 ** (layerCount - 1 - l) : layer.length;

    const maxSlots = tree.layers.reduce(
      (max, layer, l) => Math.max(max, slotsFor(layer, l)),
      1,
    );

    const r = compact ? 7 : Math.max(5, Math.min(11, 220 / Math.max(widest, maxSlots)));
    const hGap = compact ? 52 : 62;
    const w = Math.max(320, maxSlots * (compact ? 44 : 56));
    const h = (layerCount - 1) * hGap + r * 2 + (compact ? 16 : 28);

    // Which drawn node is which leaf, keyed "layer:index".
    const leafAtKey = new Map<string, number>();
    tree.leafPositions.forEach((pos, i) => leafAtKey.set(`${pos.layer}:${pos.index}`, i));

    // Ancestors of the proved leaf, from its own layer upward. Layers below it
    // stay undefined, which matters when leaves are not all on layer 0.
    const pathIdx: Array<number | undefined> = [];
    const startLayer = leafIndex === null ? 0 : (tree.leafPositions[leafIndex]?.layer ?? 0);
    if (leafIndex !== null) {
      let idx = tree.leafPositions[leafIndex]?.index ?? leafIndex;
      for (let l = startLayer; l < layerCount; l += 1) {
        pathIdx[l] = idx;
        idx = Math.floor(idx / 2);
      }
    }

    // Siblings contributed to the proof (a promoted odd node has none).
    const proofIdx: Array<number | undefined> = [];
    if (leafIndex !== null) {
      for (let l = startLayer; l < layerCount - 1; l += 1) {
        const own = pathIdx[l];
        if (own === undefined) continue;
        const sibling = own % 2 === 0 ? own + 1 : own - 1;
        proofIdx[l] = tree.layers[l]![sibling] !== undefined ? sibling : undefined;
      }
    }

    const placed: Node[] = [];
    tree.layers.forEach((layer, l) => {
      const y = h - r - (compact ? 8 : 14) - l * hGap;
      layer.forEach((hash, i) => {
        const x = ((i + 0.5) * w) / slotsFor(layer, l);
        let role: Node['role'] = 'plain';
        if (l === layerCount - 1) role = 'root';
        if (leafIndex !== null) {
          if (pathIdx[l] === i) role = l === layerCount - 1 ? 'root' : 'path';
          else if (proofIdx[l] === i) role = 'proof';
        }
        placed.push({ layer: l, index: i, x, y, hash, role });
      });
    });

    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; active: boolean }> = [];
    tree.layers.forEach((layer, l) => {
      if (l === 0) return;
      layer.forEach((_, parentIdx) => {
        const parent = placed.find((n) => n.layer === l && n.index === parentIdx)!;
        for (const childIdx of [parentIdx * 2, parentIdx * 2 + 1]) {
          const child = placed.find((n) => n.layer === l - 1 && n.index === childIdx);
          if (!child) continue;
          const active =
            leafIndex !== null &&
            (pathIdx[l - 1] === childIdx || proofIdx[l - 1] === childIdx) &&
            pathIdx[l] === parentIdx;
          lines.push({ x1: child.x, y1: child.y, x2: parent.x, y2: parent.y, active });
        }
      });
    });

    return {
      nodes: placed,
      edges: lines,
      width: w,
      height: h,
      radius: r,
      leafAt: leafAtKey,
      leafCount,
    };
  }, [tree, leafIndex, compact]);

  const pathColor = broken ? '#F4527A' : '#7C6BF5';

  return (
    <div className={cn('w-full min-w-0 overflow-x-auto', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        style={
          // Wide trees scroll inside this box rather than stretching the page;
          // small ones just scale down with the viewBox.
          !compact && tree.leaves.length > 16
            ? { minWidth: `${Math.min(tree.leaves.length * 28, 1200)}px` }
            : undefined
        }
        role="img"
        aria-label={
          leafIndex === null
            ? `Merkle tree with ${tree.leaves.length} leaves`
            : `Merkle tree with ${tree.leaves.length} leaves, showing the proof path for leaf ${leafIndex}`
        }
      >
        <g>
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.active ? pathColor : '#262B35'}
              strokeWidth={e.active ? 1.6 : 1}
              className="transition-[stroke] duration-200"
            />
          ))}
        </g>
        <g>
          {nodes.map((n) => {
            const fill =
              n.role === 'proof'
                ? '#2DD4A7'
                : n.role === 'path' || n.role === 'root'
                  ? pathColor
                  : '#262B35';
            const ownLeaf = leafAt.get(`${n.layer}:${n.index}`);
            const selectable = ownLeaf !== undefined && onSelectLeaf;

            const circle = (
              <>
                {(n.role === 'path' || n.role === 'root' || n.role === 'proof') && (
                  <circle cx={n.x} cy={n.y} r={radius + 4} fill={fill} opacity={0.18} />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={radius}
                  fill={fill}
                  stroke={n.role === 'plain' ? '#363D4A' : fill}
                  strokeWidth={1}
                  className="transition-[fill] duration-200"
                />
              </>
            );

            if (!selectable) {
              return (
                <g key={`${n.layer}-${n.index}`}>
                  <title>{`Layer ${n.layer}, node ${n.index}: ${n.hash}`}</title>
                  {circle}
                </g>
              );
            }

            return (
              <g
                key={`${n.layer}-${n.index}`}
                role="button"
                tabIndex={0}
                aria-label={`Select leaf ${ownLeaf}`}
                aria-pressed={leafIndex === ownLeaf}
                onClick={() => onSelectLeaf(ownLeaf!)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLeaf(ownLeaf!);
                  }
                }}
                className="cursor-pointer focus:outline-none [&:focus-visible>circle:last-of-type]:stroke-brand-bright [&:focus-visible>circle:last-of-type]:stroke-[3]"
              >
                <title>{`Leaf ${ownLeaf}: ${n.hash}`}</title>
                <circle cx={n.x} cy={n.y} r={radius + 8} fill="transparent" />
                {circle}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export function TreeLegend({ broken = false }: { broken?: boolean }) {
  const items = [
    { color: broken ? 'bg-invalid' : 'bg-brand', label: 'Proof path' },
    { color: 'bg-valid', label: 'Proof siblings' },
    { color: 'bg-ink-700', label: 'Other nodes' },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-2xs text-ink-400">
          <span className={cn('h-2 w-2 rounded-full', item.color)} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
