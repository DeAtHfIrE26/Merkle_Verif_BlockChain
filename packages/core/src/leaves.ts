/**
 * Leaf encodings.
 *
 * A Merkle root is only meaningful next to the rule that produced its leaves.
 * Hashing an address one way and verifying it another produces a valid-looking
 * proof for a tree nobody else has, which is the single most common reason a
 * hand-built proof is rejected on-chain.
 *
 * Three encodings cover what real contracts actually do:
 *
 *   raw      keccak256(bytes)                              — any string or hash
 *   packed   keccak256(abi.encodePacked(address, uint256))  — hand-rolled airdrops
 *   standard keccak256(keccak256(abi.encode(address, uint256)))
 *                                                          — OpenZeppelin
 *
 * `standard` reproduces OpenZeppelin's `StandardMerkleTree` exactly, which
 * means double-hashed leaves *and* leaves ordered by hash descending rather
 * than by input line. `leaves.test.ts` asserts root-and-proof equality against
 * the real `@openzeppelin/merkle-tree` package, so this claim is checked rather
 * than asserted.
 *
 * Double hashing is what defeats the second-preimage property described in
 * `merkle.ts`: a 64-byte internal node can never collide with a leaf whose
 * preimage is a 32-byte hash.
 */

import { encodeAbiParameters, encodePacked, getAddress, keccak256, stringToHex } from 'viem';
import { type Hex, normalizeHex } from './hex.js';
import { buildMerkleTree, buildStandardMerkleTree, type MerkleTree, type TreeScheme } from './merkle.js';

export type LeafEncoding = 'raw' | 'packed' | 'standard';

export class LeafEncodingError extends Error {
  /** 0-based index of the input line that could not be parsed. */
  readonly line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'LeafEncodingError';
    this.line = line;
  }
}

export interface LeafEncodingInfo {
  readonly id: LeafEncoding;
  readonly label: string;
  /** One line under the label in the UI. */
  readonly hint: string;
  /** The formula, shown verbatim so the reader can match it to their contract. */
  readonly formula: string;
  readonly placeholder: string;
  /** True when tree order is not input order. */
  readonly reorders: boolean;
  /**
   * The assembly this encoding implies. Leaf hashing and tree shape are not
   * independent choices -- an OpenZeppelin leaf in a layered tree yields a root
   * no OpenZeppelin contract will accept -- so they are chosen together here
   * rather than exposed as a matrix the caller can get wrong.
   */
  readonly scheme: TreeScheme;
}

export const LEAF_ENCODINGS: readonly LeafEncodingInfo[] = [
  {
    id: 'raw',
    label: 'Raw value',
    hint: 'Any string or hash, hashed as-is.',
    formula: 'keccak256(bytes)',
    placeholder: '0xabc…\nalice@example.com\nany string works',
    reorders: false,
    scheme: 'layered',
  },
  {
    id: 'packed',
    label: 'Packed (address, uint256)',
    hint: 'The usual hand-rolled airdrop leaf.',
    formula: 'keccak256(abi.encodePacked(address, uint256))',
    placeholder: '0x1111111111111111111111111111111111111111, 100\n0x2222222222222222222222222222222222222222, 250',
    reorders: false,
    scheme: 'layered',
  },
  {
    id: 'standard',
    label: 'OpenZeppelin standard',
    hint: 'Matches StandardMerkleTree: double-hashed, leaves sorted by hash.',
    formula: 'keccak256(keccak256(abi.encode(address, uint256)))',
    placeholder: '0x1111111111111111111111111111111111111111, 100\n0x2222222222222222222222222222222222222222, 250',
    reorders: true,
    scheme: 'standard',
  },
];

export function leafEncodingInfo(encoding: LeafEncoding): LeafEncodingInfo {
  const found = LEAF_ENCODINGS.find((e) => e.id === encoding);
  if (!found) throw new LeafEncodingError(`Unknown leaf encoding: ${encoding}`, 0);
  return found;
}

/** A leaf paired with the input it came from, so the UI can show both. */
export interface EncodedLeaf {
  /** The original input line, exactly as typed. */
  readonly value: string;
  readonly hash: Hex;
}

/**
 * Split `0xADDRESS, AMOUNT` into its parts.
 *
 * Comma, whitespace or both are accepted, because people paste from CSVs,
 * spreadsheets and JSON alike.
 */
function parseAddressAmount(input: string, line: number): { address: Hex; amount: bigint } {
  const parts = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length !== 2) {
    throw new LeafEncodingError(
      `Line ${line + 1} needs an address and an amount, like "0xabc…, 100". Got ${parts.length} value${parts.length === 1 ? '' : 's'}.`,
      line,
    );
  }

  const [rawAddress, rawAmount] = parts as [string, string];

  let address: Hex;
  try {
    // getAddress both validates and applies the EIP-55 checksum. abi.encode
    // hashes the 20 raw bytes, so casing cannot change the leaf -- but a typo'd
    // address silently would, and this rejects it.
    address = getAddress(rawAddress) as Hex;
  } catch {
    throw new LeafEncodingError(`Line ${line + 1}: "${rawAddress}" is not a valid address.`, line);
  }

  let amount: bigint;
  try {
    amount = BigInt(rawAmount);
  } catch {
    throw new LeafEncodingError(`Line ${line + 1}: "${rawAmount}" is not a whole number.`, line);
  }
  if (amount < 0n) {
    throw new LeafEncodingError(`Line ${line + 1}: amount cannot be negative.`, line);
  }

  return { address, amount };
}

/** Hash one input line under `encoding`. */
export function encodeLeaf(value: string, encoding: LeafEncoding, line = 0): Hex {
  if (encoding === 'raw') {
    const asHex = normalizeHex(value);
    return keccak256(asHex ?? stringToHex(value));
  }

  const { address, amount } = parseAddressAmount(value, line);

  if (encoding === 'packed') {
    return keccak256(encodePacked(['address', 'uint256'], [address, amount]));
  }

  // standard: OpenZeppelin hashes the ABI encoding twice.
  const encoded = encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [address, amount],
  );
  return keccak256(keccak256(encoded));
}

/**
 * Encode every input line, returning leaves in **tree order**.
 *
 * For `standard` that is descending by leaf hash, which is what
 * `StandardMerkleTree` does internally; every other encoding keeps input order.
 * Each leaf carries its original line so the caller never has to track the
 * permutation itself.
 *
 * @throws LeafEncodingError naming the offending line.
 */
export function encodeLeaves(
  values: readonly string[],
  encoding: LeafEncoding,
): EncodedLeaf[] {
  const encoded = values.map((value, line) => ({
    value,
    hash: encodeLeaf(value, encoding, line),
  }));

  if (!leafEncodingInfo(encoding).reorders) return encoded;

  // Descending by hash, matching OpenZeppelin. Hashes are fixed-width lowercase
  // hex, so lexicographic order is byte order.
  return [...encoded].sort((a, b) => (a.hash < b.hash ? 1 : a.hash > b.hash ? -1 : 0));
}

/** A built tree plus the original input line behind each of its leaves. */
export interface EncodedTree {
  readonly tree: MerkleTree;
  /** Parallel to `tree.leaves`: same order, carrying the text it came from. */
  readonly leaves: readonly EncodedLeaf[];
}

/**
 * Encode `values` and assemble them under the scheme the encoding implies.
 *
 * This is the entry point callers should use. Choosing a leaf encoding and a
 * tree shape separately is the mistake that produces a proof no contract
 * accepts, so the two are decided together here.
 *
 * @throws LeafEncodingError naming the offending line.
 * @throws MerkleError if the set is empty.
 */
export function buildEncodedTree(
  values: readonly string[],
  encoding: LeafEncoding,
): EncodedTree {
  const encoded = values.map((value, line) => ({
    value,
    hash: encodeLeaf(value, encoding, line),
  }));

  if (leafEncodingInfo(encoding).scheme === 'standard') {
    const tree = buildStandardMerkleTree(encoded.map((l) => l.hash));
    // buildStandardMerkleTree sorts, so re-associate each leaf with its text.
    const byHash = new Map<Hex, EncodedLeaf[]>();
    for (const leaf of encoded) {
      const bucket = byHash.get(leaf.hash);
      if (bucket) bucket.push(leaf);
      else byHash.set(leaf.hash, [leaf]);
    }
    // shift() rather than get() so duplicate lines keep distinct entries.
    const leaves = tree.leaves.map((hash) => byHash.get(hash)!.shift()!);
    return { tree, leaves };
  }

  return { tree: buildMerkleTree(encoded.map((l) => l.hash)), leaves: encoded };
}
