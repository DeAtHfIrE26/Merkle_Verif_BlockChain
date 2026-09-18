import { describe, expect, it } from 'vitest';
import {
  buildMerkleTree,
  buildTreeFromValues,
  getProof,
  hashLeaf,
  hashPair,
  indexOfLeaf,
  isInternalNode,
  MerkleError,
  nodeCount,
  processProof,
  verifyProof,
} from './merkle.js';
import type { Hex } from './hex.js';

const leaf = (n: number): Hex => hashLeaf(`leaf-${n}`);
const leaves = (count: number): Hex[] => Array.from({ length: count }, (_, i) => leaf(i));

describe('hashPair', () => {
  it('is order-independent, because pairs are sorted before hashing', () => {
    const [a, b] = [leaf(1), leaf(2)];
    expect(hashPair(a, b)).toBe(hashPair(b, a));
  });

  it('is case-insensitive about its inputs', () => {
    const [a, b] = [leaf(1), leaf(2)];
    expect(hashPair(a.toUpperCase() as Hex, b)).toBe(hashPair(a, b));
  });
});

describe('hashLeaf', () => {
  it('hashes hex by its bytes and other strings as UTF-8', () => {
    expect(hashLeaf(`0x${'aa'.repeat(32)}`)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashLeaf('hello')).not.toBe(hashLeaf('0xhello'));
  });

  it('handles unicode and very long input', () => {
    expect(hashLeaf('🚀 日本語 café')).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashLeaf('x'.repeat(100_000))).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(hashLeaf('same')).toBe(hashLeaf('same'));
  });
});

describe('buildMerkleTree', () => {
  it('rejects an empty leaf set', () => {
    expect(() => buildMerkleTree([])).toThrow(MerkleError);
  });

  it('rejects leaves that are not 32 bytes, naming the index', () => {
    expect(() => buildMerkleTree([leaf(0), '0xdeadbeef' as Hex])).toThrow(/index 1/);
  });

  it('treats a single leaf as its own root with an empty proof', () => {
    const tree = buildMerkleTree([leaf(0)]);
    expect(tree.root).toBe(leaf(0));
    expect(tree.layers).toHaveLength(1);
    expect(getProof(tree, 0)).toEqual([]);
    expect(verifyProof(leaf(0), [], tree.root)).toBe(true);
  });

  it('builds the expected two-leaf root', () => {
    const tree = buildMerkleTree([leaf(0), leaf(1)]);
    expect(tree.root).toBe(hashPair(leaf(0), leaf(1)));
  });

  it('promotes the odd node unchanged rather than pairing it with itself', () => {
    const tree = buildMerkleTree(leaves(3));
    // Layer 1 is [hash(l0,l1), l2] — the third leaf carries up untouched.
    expect(tree.layers[1]).toEqual([hashPair(leaf(0), leaf(1)), leaf(2)]);
  });

  it('is deterministic and order-sensitive', () => {
    expect(buildMerkleTree(leaves(5)).root).toBe(buildMerkleTree(leaves(5)).root);
    const reversed = [...leaves(5)].reverse();
    expect(buildMerkleTree(reversed).root).not.toBe(buildMerkleTree(leaves(5)).root);
  });

  it('accepts duplicate leaves', () => {
    const tree = buildMerkleTree([leaf(0), leaf(0)]);
    expect(tree.root).toBe(hashPair(leaf(0), leaf(0)));
  });

  it('normalises mixed-case leaves', () => {
    const upper = leaves(4).map((l) => l.toUpperCase() as Hex);
    expect(buildMerkleTree(upper).root).toBe(buildMerkleTree(leaves(4)).root);
  });
});

describe('getProof / verifyProof', () => {
  for (const size of [1, 2, 3, 4, 5, 7, 8, 9, 16, 33, 100]) {
    it(`round-trips every leaf in a ${size}-leaf tree`, () => {
      const set = leaves(size);
      const tree = buildMerkleTree(set);
      for (let i = 0; i < size; i += 1) {
        expect(verifyProof(set[i]!, getProof(tree, i), tree.root)).toBe(true);
      }
    });
  }

  it('rejects an out-of-range index', () => {
    const tree = buildMerkleTree(leaves(4));
    expect(() => getProof(tree, 4)).toThrow(/out of range/);
    expect(() => getProof(tree, -1)).toThrow(MerkleError);
    expect(() => getProof(tree, 1.5)).toThrow(MerkleError);
  });

  it('fails a leaf that is not in the tree', () => {
    const tree = buildMerkleTree(leaves(4));
    expect(verifyProof(leaf(99), getProof(tree, 0), tree.root)).toBe(false);
  });

  it('fails when any proof element is altered', () => {
    const set = leaves(8);
    const tree = buildMerkleTree(set);
    const proof = getProof(tree, 3);
    const tampered = [...proof];
    tampered[0] = leaf(999);
    expect(verifyProof(set[3]!, tampered, tree.root)).toBe(false);
  });

  it('fails when proof elements are reordered', () => {
    const set = leaves(8);
    const tree = buildMerkleTree(set);
    const reordered = [...getProof(tree, 0)].reverse();
    expect(verifyProof(set[0]!, reordered, tree.root)).toBe(false);
  });

  it('fails an empty proof against a multi-leaf tree', () => {
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    expect(verifyProof(set[0]!, [], tree.root)).toBe(false);
  });

  it('fails against a different root', () => {
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    expect(verifyProof(set[0]!, getProof(tree, 0), leaf(1234))).toBe(false);
  });

  it('returns false rather than throwing on malformed input', () => {
    const tree = buildMerkleTree(leaves(4));
    expect(verifyProof('0xnope' as Hex, [], tree.root)).toBe(false);
    expect(verifyProof(leaf(0), ['0xshort' as Hex], tree.root)).toBe(false);
    expect(verifyProof(leaf(0), [], '0xbad' as Hex)).toBe(false);
  });

  it('is case-insensitive end to end', () => {
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    const proof = getProof(tree, 1).map((p) => p.toUpperCase() as Hex);
    expect(verifyProof(set[1]!.toUpperCase() as Hex, proof, tree.root.toUpperCase() as Hex)).toBe(
      true,
    );
  });
});

describe('processProof', () => {
  it('folds to the root and is pure', () => {
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    const proof = getProof(tree, 2);
    expect(processProof(set[2]!, proof)).toBe(tree.root);
    expect(processProof(set[2]!, proof)).toBe(tree.root);
  });
});

describe('isInternalNode — second-preimage surface', () => {
  it('flags an internal node presented as a leaf', () => {
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    const internal = tree.layers[1]![0]!;
    expect(isInternalNode(tree, internal)).toBe(true);
    expect(isInternalNode(tree, set[0]!)).toBe(false);
  });

  it('confirms the internal node really does verify as a leaf', () => {
    // This documents the known weakness of sorted-pair trees rather than
    // asserting it away: an internal node plus the rest of the path verifies.
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    const internal = tree.layers[1]![0]!;
    const sibling = tree.layers[1]![1]!;
    expect(verifyProof(internal, [sibling], tree.root)).toBe(true);
  });
});

describe('helpers', () => {
  it('indexOfLeaf finds leaves case-insensitively and reports -1 otherwise', () => {
    const set = leaves(4);
    const tree = buildMerkleTree(set);
    expect(indexOfLeaf(tree, set[2]!)).toBe(2);
    expect(indexOfLeaf(tree, set[2]!.toUpperCase() as Hex)).toBe(2);
    expect(indexOfLeaf(tree, leaf(42))).toBe(-1);
  });

  it('nodeCount sums every layer', () => {
    expect(nodeCount(buildMerkleTree(leaves(4)))).toBe(7);
    expect(nodeCount(buildMerkleTree(leaves(1)))).toBe(1);
  });

  it('buildTreeFromValues hashes raw values first', () => {
    const tree = buildTreeFromValues(['a', 'b']);
    expect(tree.root).toBe(hashPair(hashLeaf('a'), hashLeaf('b')));
  });
});

describe('scale', () => {
  it('handles a 1,000-leaf tree and verifies a sampled subset', () => {
    const set = leaves(1000);
    const tree = buildMerkleTree(set);
    for (const i of [0, 1, 499, 500, 998, 999]) {
      expect(verifyProof(set[i]!, getProof(tree, i), tree.root)).toBe(true);
    }
  });
});
