import { describe, expect, it } from 'vitest';
import {
  formatUsdc,
  generateSimulatedTransfers,
  SAMPLE_TX_HASHES,
  SAMPLE_TX_LABELS,
  SIMULATED_TARGET_ADDRESS,
  SUBGRAPH_QUERY,
} from './samples.js';
import { isHash32, isAddressLike } from './hex.js';

describe('sample transaction hashes', () => {
  it('are well-formed and unique', () => {
    expect(SAMPLE_TX_HASHES).toHaveLength(8);
    expect(SAMPLE_TX_HASHES.every(isHash32)).toBe(true);
    expect(new Set(SAMPLE_TX_HASHES).size).toBe(SAMPLE_TX_HASHES.length);
  });

  it('have a label each', () => {
    expect(SAMPLE_TX_LABELS).toHaveLength(SAMPLE_TX_HASHES.length);
  });
});

describe('generateSimulatedTransfers', () => {
  it('is deterministic for a given seed', () => {
    const a = generateSimulatedTransfers(10, 42, 1_700_000_000);
    const b = generateSimulatedTransfers(10, 42, 1_700_000_000);
    expect(a).toEqual(b);
  });

  it('differs across seeds', () => {
    const a = generateSimulatedTransfers(10, 1, 1_700_000_000);
    const b = generateSimulatedTransfers(10, 2, 1_700_000_000);
    expect(a[0]!.from).not.toBe(b[0]!.from);
  });

  it('produces well-formed, newest-first records', () => {
    const transfers = generateSimulatedTransfers(12, 7, 1_700_000_000);
    expect(transfers).toHaveLength(12);
    for (const t of transfers) {
      expect(isAddressLike(t.from)).toBe(true);
      expect(isHash32(t.transactionHash)).toBe(true);
      expect(t.to).toBe(SIMULATED_TARGET_ADDRESS);
      expect(BigInt(t.value)).toBeGreaterThan(0n);
    }
    for (let i = 1; i < transfers.length; i += 1) {
      expect(transfers[i]!.blockNumber).toBeLessThan(transfers[i - 1]!.blockNumber);
      expect(transfers[i]!.timestamp).toBeLessThan(transfers[i - 1]!.timestamp);
    }
  });

  it('handles a zero count', () => {
    expect(generateSimulatedTransfers(0, 1, 1_700_000_000)).toEqual([]);
  });

  it('has unique ids and hashes', () => {
    const transfers = generateSimulatedTransfers(50, 9, 1_700_000_000);
    expect(new Set(transfers.map((t) => t.id)).size).toBe(50);
    expect(new Set(transfers.map((t) => t.transactionHash)).size).toBe(50);
  });
});

describe('formatUsdc', () => {
  it('formats base units with two decimals and thousands separators', () => {
    expect(formatUsdc('1000000')).toBe('1.00');
    expect(formatUsdc('1234567')).toBe('1.23');
    expect(formatUsdc('1000000000')).toBe('1,000.00');
    expect(formatUsdc('0')).toBe('0.00');
    expect(formatUsdc('1')).toBe('0.00');
  });

  it('handles very large values without precision loss', () => {
    expect(formatUsdc('123456789012345678')).toBe('123,456,789,012.34');
  });
});

describe('SUBGRAPH_QUERY', () => {
  it('is the real query shape, kept alongside the simulated data', () => {
    expect(SUBGRAPH_QUERY).toContain('transfers(');
    expect(SUBGRAPH_QUERY).toContain('orderDirection: desc');
    expect(SUBGRAPH_QUERY).toContain('transactionHash');
  });
});
