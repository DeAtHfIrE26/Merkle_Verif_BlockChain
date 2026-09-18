'use client';

import { useMemo } from 'react';
import type { MerkleTree } from '@merkle-verify/core';
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
  const { nodes, edges, width, height, radius } = useMemo(() => {
    const layerCount = tree.layers.length;
    const leafCount = tree.layers[0]!.length;

    const r = compact ? 7 : Math.max(5, Math.min(11, 220 / leafCount));
    const hGap = compact ? 52 : 62;
    const w = Math.max(320, leafCount * (compact ? 44 : 56));
    const h = (layerCount - 1) * hGap + r * 2 + (compact ? 16 : 28);

    // Ancestors of the proved leaf, layer by layer.
    const pathIdx: number[] = [];
    if (leafIndex !== null) {
      let idx = leafIndex;
      for (let l = 0; l < layerCount; l += 1) {
        pathIdx[l] = idx;
        idx = Math.floor(idx / 2);
      }
    }

    // Siblings contributed to the proof (a promoted odd node has none).
    const proofIdx: Array<number | undefined> = [];
    if (leafIndex !== null) {
      for (let l = 0; l < layerCount - 1; l += 1) {
        const own = pathIdx[l]!;
        const sibling = own % 2 === 0 ? own + 1 : own - 1;
        proofIdx[l] = tree.layers[l]![sibling] !== undefined ? sibling : undefined;
      }
    }

    const placed: Node[] = [];
    tree.layers.forEach((layer, l) => {
      const y = h - r - (compact ? 8 : 14) - l * hGap;
      layer.forEach((hash, i) => {
        const x = ((i + 0.5) * w) / layer.length;
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

    return { nodes: placed, edges: lines, width: w, height: h, radius: r };
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
          !compact && tree.layers[0]!.length > 16
            ? { minWidth: `${Math.min(tree.layers[0]!.length * 28, 1200)}px` }
            : undefined
        }
        role="img"
        aria-label={
          leafIndex === null
            ? `Merkle tree with ${tree.layers[0]!.length} leaves`
            : `Merkle tree with ${tree.layers[0]!.length} leaves, showing the proof path for leaf ${leafIndex}`
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
            const isLeaf = n.layer === 0;
            const selectable = isLeaf && onSelectLeaf;

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
                aria-label={`Select leaf ${n.index}`}
                aria-pressed={leafIndex === n.index}
                onClick={() => onSelectLeaf(n.index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLeaf(n.index);
                  }
                }}
                className="cursor-pointer focus:outline-none [&:focus-visible>circle:last-of-type]:stroke-brand-bright [&:focus-visible>circle:last-of-type]:stroke-[3]"
              >
                <title>{`Leaf ${n.index}: ${n.hash}`}</title>
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
