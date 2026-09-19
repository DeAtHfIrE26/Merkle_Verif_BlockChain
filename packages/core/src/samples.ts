/**
 * Deterministic sample data for the demo paths.
 *
 * IMPORTANT — everything in this file is SYNTHETIC. These are not real
 * transactions and these addresses belong to nobody. The UI labels every
 * surface fed from here as simulated; do not present this data as on-chain
 * history.
 *
 * Generation is seeded so that the same seed always yields the same set. That
 * keeps snapshots, screenshots and E2E assertions stable, and means the demo
 * looks identical on every visit rather than reshuffling on each render.
 */

import { keccak256, stringToHex } from 'viem';
import type { Hex } from './hex.js';

/** xorshift32 — small, fast, and deterministic across engines. */
function createRng(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function pseudoHash(seed: string): Hex {
  return keccak256(stringToHex(seed));
}

/** A synthetic 20-byte address derived from a label. */
function pseudoAddress(seed: string): Hex {
  return `0x${pseudoHash(seed).slice(-40)}` as Hex;
}

/**
 * Synthetic transaction hashes standing in for one block's contents.
 * Used as the Merkle Explorer's "Load sample" data.
 */
export const SAMPLE_TX_HASHES: readonly Hex[] = Array.from({ length: 8 }, (_, i) =>
  pseudoHash(`merkle-verify/sample-tx/${i}`),
);

/** Short human labels shown next to each sample leaf in the UI. */
export const SAMPLE_TX_LABELS: readonly string[] = [
  'Transfer · 250 USDC',
  'Swap · ETH → USDC',
  'Approve · Router',
  'Mint · NFT #4210',
  'Transfer · 1,000 USDC',
  'Stake · 4.2 ETH',
  'Bridge · to Base',
  'Claim · rewards',
];

export interface SimulatedTransfer {
  id: string;
  from: Hex;
  to: Hex;
  /** Base units — USDC has 6 decimals. */
  value: string;
  /** Unix seconds. */
  timestamp: number;
  blockNumber: number;
  transactionHash: Hex;
}

/** The synthetic address the simulated tracker watches. */
export const SIMULATED_TARGET_ADDRESS: Hex = pseudoAddress('merkle-verify/target');

/**
 * Build a deterministic run of simulated USDC transfers, newest first.
 *
 * @param count how many to produce
 * @param seed  fixed seed; the same seed always yields the same run
 * @param nowSeconds reference time, so callers can pin it in tests
 */
export function generateSimulatedTransfers(
  count = 12,
  seed = 20241123,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SimulatedTransfer[] {
  const rng = createRng(seed);
  const transfers: SimulatedTransfer[] = [];

  let block = 7_412_900;
  let timestamp = nowSeconds;

  for (let i = 0; i < count; i += 1) {
    // Amounts cluster in a believable range rather than being uniform noise.
    const magnitude = rng() < 0.25 ? 1_000_000 : rng() < 0.6 ? 100_000 : 10_000;
    const value = String(Math.floor(magnitude + rng() * magnitude * 9));

    transfers.push({
      id: `sim-${seed}-${i}`,
      from: pseudoAddress(`merkle-verify/sender/${seed}/${i}`),
      to: SIMULATED_TARGET_ADDRESS,
      value,
      timestamp,
      blockNumber: block,
      transactionHash: pseudoHash(`merkle-verify/sim-tx/${seed}/${i}`),
    });

    // Walk backwards in time: ~12s blocks, irregular gaps between transfers.
    const blocksBack = 5 + Math.floor(rng() * 400);
    block -= blocksBack;
    timestamp -= blocksBack * 12;
  }

  return transfers;
}

/**
 * The subgraph query the real tracker would issue. Displayed verbatim in the
 * UI so the simulated view still documents the actual integration.
 */
export const SUBGRAPH_QUERY = `query RecentTransfers($to: Bytes!, $first: Int!) {
  transfers(
    first: $first
    orderBy: blockNumber
    orderDirection: desc
    where: { to: $to }
  ) {
    id
    from
    to
    value
    timestamp
    blockNumber
    transactionHash
  }
}`;

/** The subgraph schema backing that query. */
export const SUBGRAPH_SCHEMA = `type Transfer @entity {
  id: ID!
  from: Bytes!
  to: Bytes!
  value: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}`;

/** Format USDC base units (6 decimals) for display. */
export function formatUsdc(baseUnits: string): string {
  const units = BigInt(baseUnits);
  const whole = units / 1_000_000n;
  const frac = units % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').slice(0, 2);
  return `${whole.toLocaleString('en-US')}.${fracStr}`;
}
