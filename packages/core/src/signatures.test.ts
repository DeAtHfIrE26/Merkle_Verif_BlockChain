import { describe, expect, it } from 'vitest';
import {
  addressForPrivateKey,
  createBurnerKey,
  eip191Digest,
  hashMessageContent,
  parseSignature,
  recoverSigner,
  SECP256K1_HALF_N,
  SECP256K1_N,
  signDigest,
  SignatureError,
  verifySignature,
} from './signatures.js';
import type { Hex } from './hex.js';

const KEY: Hex = `0x${'11'.repeat(32)}`;
const SIGNER = addressForPrivateKey(KEY);
const DIGEST = hashMessageContent('Hello, Ethereum!');

describe('curve constants', () => {
  it('uses half the curve order, not 2^255 - 1', () => {
    expect(SECP256K1_HALF_N).toBe(SECP256K1_N / 2n);
    // The contract this project inherited compared against 2^255 - 1, which is
    // larger than n/2 and so admitted a band of malleable signatures.
    expect(SECP256K1_HALF_N).toBeLessThan(2n ** 255n - 1n);
  });
});

describe('key handling', () => {
  it('derives a stable address for a key', () => {
    expect(addressForPrivateKey(KEY)).toBe(SIGNER);
    expect(SIGNER).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('generates distinct burner keys', () => {
    expect(createBurnerKey()).not.toBe(createBurnerKey());
    expect(createBurnerKey()).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('EIP-191 vs raw — the bug this project inherited', () => {
  it('recovers the signer when signing and verifying both use EIP-191', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    expect(await recoverSigner(DIGEST, sig, 'eip191')).toBe(SIGNER);
  });

  it('recovers the signer when both use raw', async () => {
    const sig = await signDigest(KEY, DIGEST, 'raw');
    expect(await recoverSigner(DIGEST, sig, 'raw')).toBe(SIGNER);
  });

  it('does NOT recover the signer when the modes are mixed', async () => {
    // This is exactly the original failure: signMessage applies the EIP-191
    // prefix, while the contract ecrecovered the raw digest.
    const prefixed = await signDigest(KEY, DIGEST, 'eip191');
    expect(await recoverSigner(DIGEST, prefixed, 'raw')).not.toBe(SIGNER);

    const raw = await signDigest(KEY, DIGEST, 'raw');
    expect(await recoverSigner(DIGEST, raw, 'eip191')).not.toBe(SIGNER);
  });

  it('produces a different digest under the prefix', () => {
    expect(eip191Digest(DIGEST)).not.toBe(DIGEST);
    expect(eip191Digest(DIGEST)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('parseSignature', () => {
  it('splits a real signature and passes all three checks', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const parts = parseSignature(sig);
    expect(parts.correctLength).toBe(true);
    expect(parts.validV).toBe(true);
    expect(parts.lowS).toBe(true);
    expect(parts.r).toMatch(/^0x[0-9a-f]{64}$/);
    expect([27, 28]).toContain(parts.v);
  });

  it('flags a wrong-length signature without throwing', () => {
    expect(parseSignature('0xdeadbeef').correctLength).toBe(false);
    expect(parseSignature(`0x${'11'.repeat(64)}`).correctLength).toBe(false);
    expect(parseSignature(`0x${'11'.repeat(66)}`).correctLength).toBe(false);
  });

  it('flags garbage input without throwing', () => {
    for (const input of ['', '   ', 'not hex at all', '0x', '🚀']) {
      expect(parseSignature(input).correctLength).toBe(false);
    }
  });

  it('normalises v of 0/1 to 27/28', () => {
    expect(parseSignature(`0x${'11'.repeat(64)}00`).v).toBe(27);
    expect(parseSignature(`0x${'11'.repeat(64)}01`).v).toBe(28);
  });

  it('flags an out-of-range v', () => {
    expect(parseSignature(`0x${'11'.repeat(64)}05`).validV).toBe(false);
  });

  it('flags a high-s signature as malleable', () => {
    const highS = (SECP256K1_HALF_N + 1n).toString(16).padStart(64, '0');
    const parts = parseSignature(`0x${'11'.repeat(32)}${highS}1b`);
    expect(parts.correctLength).toBe(true);
    expect(parts.lowS).toBe(false);
  });

  it('accepts s exactly at the half-order boundary', () => {
    const atBoundary = SECP256K1_HALF_N.toString(16).padStart(64, '0');
    expect(parseSignature(`0x${'11'.repeat(32)}${atBoundary}1b`).lowS).toBe(true);
  });
});

describe('signDigest', () => {
  it('rejects a digest that is not 32 bytes', async () => {
    await expect(signDigest(KEY, '0xdeadbeef' as Hex, 'eip191')).rejects.toThrow(SignatureError);
  });
});

describe('verifySignature', () => {
  it('accepts a correct signature', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const result = await verifySignature(SIGNER, DIGEST, sig, 'eip191');
    expect(result.valid).toBe(true);
    expect(result.recovered).toBe(SIGNER);
    expect(result.reason).toBeNull();
  });

  it('rejects a signature from a different signer, and says why', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const other = addressForPrivateKey(`0x${'22'.repeat(32)}`);
    const result = await verifySignature(other, DIGEST, sig, 'eip191');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/does not match/);
  });

  it('rejects a tampered signature', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const flipped = `${sig.slice(0, -4)}${sig.slice(-4) === 'aa1b' ? 'bb1b' : 'aa1b'}` as Hex;
    const result = await verifySignature(SIGNER, DIGEST, flipped, 'eip191');
    expect(result.valid).toBe(false);
  });

  it('rejects a signature over a different message', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const otherDigest = hashMessageContent('Goodbye, Ethereum!');
    const result = await verifySignature(SIGNER, otherDigest, sig, 'eip191');
    expect(result.valid).toBe(false);
  });

  it('explains a wrong-length signature', async () => {
    const result = await verifySignature(SIGNER, DIGEST, '0xdeadbeef', 'eip191');
    expect(result.reason).toMatch(/exactly 65 bytes/);
  });

  it('explains a bad v', async () => {
    const result = await verifySignature(SIGNER, DIGEST, `0x${'11'.repeat(64)}05`, 'eip191');
    expect(result.reason).toMatch(/must be 27 or 28/);
  });

  it('explains a malleable high-s signature', async () => {
    const highS = (SECP256K1_HALF_N + 1n).toString(16).padStart(64, '0');
    const result = await verifySignature(
      SIGNER,
      DIGEST,
      `0x${'11'.repeat(32)}${highS}1b`,
      'eip191',
    );
    expect(result.reason).toMatch(/malleable/);
  });

  it('explains an invalid expected signer', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const result = await verifySignature('not-an-address', DIGEST, sig, 'eip191');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/not a valid address/);
  });

  it('is case-insensitive about the expected signer', async () => {
    const sig = await signDigest(KEY, DIGEST, 'eip191');
    const result = await verifySignature(SIGNER.toUpperCase(), DIGEST, sig, 'eip191');
    expect(result.valid).toBe(true);
  });
});

describe('hashMessageContent', () => {
  it('hashes hex by bytes and text as UTF-8', () => {
    expect(hashMessageContent(`0x${'aa'.repeat(32)}`)).toMatch(/^0x[0-9a-f]{64}$/);
    // '0x68656c6c6f' is the hex encoding of 'hello', so both paths hash the
    // same five bytes and must agree — including with an uppercase prefix.
    expect(hashMessageContent('hello')).toBe(hashMessageContent('0x68656c6c6f'));
    expect(hashMessageContent('hello')).toBe(hashMessageContent('0X68656C6C6F'));
  });

  it('handles empty, unicode and very long messages', () => {
    expect(hashMessageContent('')).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashMessageContent('🚀 日本語')).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashMessageContent('x'.repeat(50_000))).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
