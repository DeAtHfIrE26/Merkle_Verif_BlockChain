import { describe, expect, it } from 'vitest';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { encodePacked, keccak256 } from 'viem';
import {
  buildEncodedTree,
  encodeLeaf,
  encodeLeaves,
  LEAF_ENCODINGS,
  LeafEncodingError,
  leafEncodingInfo,
} from './leaves.js';
import { getProof, verifyProof } from './merkle.js';
import type { Hex } from './hex.js';

/** Deterministic addresses/amounts so a failure is reproducible. */
function sampleRows(n: number): [string, string][] {
  const rows: [string, string][] = [];
  for (let i = 1; i <= n; i += 1) {
    rows.push([`0x${i.toString(16).padStart(2, '0').repeat(20)}`, String(i * 137)]);
  }
  return rows;
}

const asLines = (rows: [string, string][]) => rows.map(([a, v]) => `${a}, ${v}`);

describe('leaf encodings', () => {
  it('exposes exactly the three documented encodings', () => {
    expect(LEAF_ENCODINGS.map((e) => e.id)).toEqual(['raw', 'packed', 'standard']);
  });

  it('only the standard encoding reorders leaves', () => {
    expect(LEAF_ENCODINGS.filter((e) => e.reorders).map((e) => e.id)).toEqual(['standard']);
  });

  it('raw hashes hex by its bytes and anything else as UTF-8', () => {
    // '0x68656c6c6f' is the hex for 'hello', so both must land on one hash.
    expect(encodeLeaf('0x68656c6c6f', 'raw')).toBe(encodeLeaf('hello', 'raw'));
  });

  it('packed matches abi.encodePacked(address, uint256)', () => {
    const address = '0x1111111111111111111111111111111111111111';
    const expected = keccak256(encodePacked(['address', 'uint256'], [address as Hex, 100n]));
    expect(encodeLeaf(`${address}, 100`, 'packed')).toBe(expected);
  });

  it('the three encodings disagree on the same input', () => {
    const line = '0x1111111111111111111111111111111111111111, 100';
    const hashes = new Set([
      encodeLeaf(line, 'raw'),
      encodeLeaf(line, 'packed'),
      encodeLeaf(line, 'standard'),
    ]);
    expect(hashes.size).toBe(3);
  });

  it('accepts commas, whitespace or both as separators', () => {
    const a = encodeLeaf('0x1111111111111111111111111111111111111111, 100', 'standard');
    const b = encodeLeaf('0x1111111111111111111111111111111111111111 100', 'standard');
    const c = encodeLeaf('0x1111111111111111111111111111111111111111,100', 'standard');
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('is indifferent to address casing, because abi.encode hashes raw bytes', () => {
    const lower = encodeLeaf('0xabababababababababababababababababababab, 7', 'standard');
    const upper = encodeLeaf('0xABABABABABABABABABABABABABABABABABABABAB, 7', 'standard');
    expect(upper).toBe(lower);
  });

  it('handles a uint256 far beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = (2n ** 255n).toString();
    expect(() =>
      encodeLeaf(`0x1111111111111111111111111111111111111111, ${huge}`, 'standard'),
    ).not.toThrow();
  });

  describe('rejects bad input with the offending line', () => {
    it('a malformed address', () => {
      expect(() => encodeLeaf('0xnope, 1', 'packed', 4)).toThrowError(LeafEncodingError);
      try {
        encodeLeaf('0xnope, 1', 'packed', 4);
      } catch (error) {
        expect((error as LeafEncodingError).line).toBe(4);
        expect((error as LeafEncodingError).message).toContain('line 5'.replace('line', 'Line'));
      }
    });

    it('a missing amount', () => {
      expect(() =>
        encodeLeaf('0x1111111111111111111111111111111111111111', 'packed'),
      ).toThrowError(/address and an amount/);
    });

    it('a non-numeric amount', () => {
      expect(() =>
        encodeLeaf('0x1111111111111111111111111111111111111111, ten', 'packed'),
      ).toThrowError(/not a whole number/);
    });

    it('a negative amount', () => {
      expect(() =>
        encodeLeaf('0x1111111111111111111111111111111111111111, -1', 'packed'),
      ).toThrowError(/cannot be negative/);
    });

    it('but raw accepts anything at all', () => {
      expect(() => encodeLeaf('not, an, address', 'raw')).not.toThrow();
    });
  });

  it('keeps input order for raw and packed', () => {
    const lines = asLines(sampleRows(6));
    for (const encoding of ['raw', 'packed'] as const) {
      expect(encodeLeaves(lines, encoding).map((l) => l.value)).toEqual(lines);
    }
  });

  it('carries the original line alongside every reordered leaf', () => {
    const lines = asLines(sampleRows(8));
    const encoded = encodeLeaves(lines, 'standard');
    expect(encoded).toHaveLength(8);
    expect([...encoded.map((l) => l.value)].sort()).toEqual([...lines].sort());
    for (const leaf of encoded) {
      expect(leaf.hash).toBe(encodeLeaf(leaf.value, 'standard'));
    }
  });

  it('orders standard leaves by hash, descending', () => {
    const encoded = encodeLeaves(asLines(sampleRows(12)), 'standard');
    const hashes = encoded.map((l) => l.hash);
    expect(hashes).toEqual([...hashes].sort().reverse());
  });

  it('leafEncodingInfo rejects an unknown id', () => {
    expect(() => leafEncodingInfo('nope' as never)).toThrowError(LeafEncodingError);
  });
});

/**
 * Differential test against the real OpenZeppelin implementation.
 *
 * The `standard` encoding claims to reproduce `StandardMerkleTree`. That claim
 * is worth nothing unless something checks it, so this builds both trees over
 * the same rows and asserts the roots match, every proof matches element for
 * element, and OpenZeppelin's own verifier accepts the proofs this package
 * produces.
 */
describe('parity with @openzeppelin/merkle-tree', () => {
  for (const n of [1, 2, 3, 4, 5, 7, 8, 9, 16, 17, 31, 64]) {
    it(`agrees on root and every proof for ${n} leaf${n === 1 ? '' : 'ves'}`, () => {
      const rows = sampleRows(n);
      const oz = StandardMerkleTree.of(rows, ['address', 'uint256']);
      const { tree, leaves } = buildEncodedTree(asLines(rows), 'standard');

      expect(tree.scheme).toBe('standard');
      expect(tree.root).toBe(oz.root);

      for (const [ozIndex, value] of oz.entries()) {
        const line = `${value[0]}, ${value[1]}`;
        const index = leaves.findIndex((l) => l.value === line);
        expect(index, `no leaf for ${line}`).toBeGreaterThanOrEqual(0);

        const ourProof = getProof(tree, index);
        expect(ourProof).toEqual(oz.getProof(ozIndex));

        // Our proof must satisfy OpenZeppelin's verifier, not merely our own.
        expect(
          StandardMerkleTree.verify(oz.root, ['address', 'uint256'], value, ourProof),
        ).toBe(true);
        expect(verifyProof(tree.leaves[index]!, ourProof, tree.root)).toBe(true);
      }
    });
  }

  it('matches the leaf order OpenZeppelin dumps', () => {
    const rows = sampleRows(9);
    const oz = StandardMerkleTree.of(rows, ['address', 'uint256']);
    const { leaves } = buildEncodedTree(asLines(rows), 'standard');
    // dump() lists entries in input order and records where each one landed,
    // so tree order is the values sorted by treeIndex.
    const ozOrder = [...oz.dump().values]
      .sort((a, b) => a.treeIndex - b.treeIndex)
      .map((v) => `${v.value[0]}, ${v.value[1]}`);
    expect(leaves.map((l) => l.value)).toEqual(ozOrder);
  });

  it('the two schemes diverge whenever the leaf count is not a power of two', () => {
    for (const n of [3, 5, 6, 7, 9]) {
      const lines = asLines(sampleRows(n));
      const standard = buildEncodedTree(lines, 'standard').tree;
      const layered = buildEncodedTree(lines, 'packed').tree;
      expect(standard.scheme).toBe('standard');
      expect(layered.scheme).toBe('layered');
      expect(standard.root, `n=${n}`).not.toBe(layered.root);
    }
  });

  it('a proof built under the wrong encoding does not verify against the standard root', () => {
    const lines = asLines(sampleRows(8));
    const oz = StandardMerkleTree.of(sampleRows(8), ['address', 'uint256']);
    const { tree } = buildEncodedTree(lines, 'packed');

    expect(tree.root).not.toBe(oz.root);
    expect(verifyProof(tree.leaves[0]!, getProof(tree, 0), oz.root)).toBe(false);
  });

  it('keeps duplicate lines as distinct leaves', () => {
    const line = '0x1111111111111111111111111111111111111111, 100';
    const { tree, leaves } = buildEncodedTree([line, line, line], 'standard');
    expect(tree.leaves).toHaveLength(3);
    expect(leaves.map((l) => l.value)).toEqual([line, line, line]);
  });

  it('every leaf verifies under both schemes, whatever its depth', () => {
    for (const encoding of ['packed', 'standard'] as const) {
      for (const n of [1, 2, 3, 5, 9, 17]) {
        const { tree } = buildEncodedTree(asLines(sampleRows(n)), encoding);
        for (let i = 0; i < n; i += 1) {
          expect(
            verifyProof(tree.leaves[i]!, getProof(tree, i), tree.root),
            `${encoding} n=${n} leaf=${i}`,
          ).toBe(true);
        }
      }
    }
  });
});
