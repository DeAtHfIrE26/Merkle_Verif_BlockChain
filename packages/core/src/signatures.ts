/**
 * ECDSA signing and signer recovery over secp256k1.
 *
 * The distinction this module exists to make explicit:
 *
 *   RAW      — ecrecover is run against a 32-byte digest exactly as given.
 *   EIP-191  — the digest is first wrapped as
 *              keccak256("\x19Ethereum Signed Message:\n32" || digest),
 *              which is what `personal_sign`, `eth_sign`, wallets and
 *              `signMessage` in every major library actually produce.
 *
 * Mixing the two is why the original repository's only happy-path test failed:
 * it signed with the EIP-191 prefix and verified against the raw digest, so
 * the recovered address never matched. Both modes are first-class here and the
 * UI shows them side by side.
 */

import {
  hashMessage,
  hexToBytes,
  keccak256,
  recoverAddress,
  stringToHex,
  type Address,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { type Hex, isHash32, isHex, normalizeHex } from './hex.js';

/** Order of the secp256k1 curve. */
export const SECP256K1_N = BigInt(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141',
);

/**
 * Half the curve order. An ECDSA signature (r, s) has an equally valid twin
 * (r, n - s), so implementations reject the high half to make signatures
 * non-malleable. This is the threshold EIP-2 and OpenZeppelin's ECDSA library
 * use.
 *
 * Note: the contract this project inherited compared against 2^255 - 1
 * instead, which is slightly larger than n/2 and therefore accepted a band of
 * malleable high-s signatures. `SignatureVerifier.sol` now uses this constant.
 */
export const SECP256K1_HALF_N = SECP256K1_N / 2n;

export type SignatureMode = 'eip191' | 'raw';

export interface SignatureParts {
  r: Hex;
  s: Hex;
  v: number;
  /** False when the input was not exactly 65 bytes. */
  correctLength: boolean;
  /** False when s is in the upper half of the curve order (malleable). */
  lowS: boolean;
  /** False when v is neither 27 nor 28. */
  validV: boolean;
}

export class SignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureError';
  }
}

/** Generate a throwaway private key. Used for the in-browser demo signer. */
export function createBurnerKey(): Hex {
  return generatePrivateKey();
}

/** Derive the address for a private key. */
export function addressForPrivateKey(privateKey: Hex): Address {
  return privateKeyToAccount(privateKey).address;
}

/**
 * Split a 65-byte signature into r, s and v, reporting the same three checks
 * the on-chain verifier performs. Never throws: a malformed signature comes
 * back with the relevant flag false so the UI can explain which check failed.
 */
export function parseSignature(signature: string): SignatureParts {
  const hex = normalizeHex(signature);
  const empty: SignatureParts = {
    r: `0x${'0'.repeat(64)}`,
    s: `0x${'0'.repeat(64)}`,
    v: 0,
    correctLength: false,
    lowS: false,
    validV: false,
  };
  if (hex === null) return empty;

  const bytes = hexToBytes(hex);
  if (bytes.length !== 65) return { ...empty, correctLength: false };

  const body = hex.slice(2);
  const r = `0x${body.slice(0, 64)}` as Hex;
  const s = `0x${body.slice(64, 128)}` as Hex;
  let v = parseInt(body.slice(128, 130), 16);
  // Wallets may emit 0/1; normalise to the 27/28 the EVM expects.
  if (v === 0 || v === 1) v += 27;

  return {
    r,
    s,
    v,
    correctLength: true,
    lowS: BigInt(s) <= SECP256K1_HALF_N,
    validV: v === 27 || v === 28,
  };
}

/** The EIP-191 digest actually signed by `personal_sign` for a 32-byte hash. */
export function eip191Digest(digest: Hex): Hex {
  return hashMessage({ raw: hexToBytes(digest) });
}

/** keccak256 of a message: hex is decoded, anything else hashed as UTF-8. */
export function hashMessageContent(message: string): Hex {
  const asHex = normalizeHex(message);
  return keccak256(asHex ?? stringToHex(message));
}

/**
 * Sign a 32-byte digest.
 * `eip191` wraps it the way a wallet would; `raw` signs the digest directly.
 */
export async function signDigest(
  privateKey: Hex,
  digest: Hex,
  mode: SignatureMode,
): Promise<Hex> {
  if (!isHash32(digest)) throw new SignatureError('Digest must be a 32-byte hex value.');
  const account = privateKeyToAccount(privateKey);
  return mode === 'eip191'
    ? account.signMessage({ message: { raw: hexToBytes(digest) } })
    : account.sign({ hash: digest });
}

/**
 * Recover the signer of `digest`.
 * Returns null instead of throwing when the signature cannot be parsed, since
 * this runs against user-pasted input on every keystroke.
 */
export async function recoverSigner(
  digest: Hex,
  signature: string,
  mode: SignatureMode,
): Promise<Address | null> {
  if (!isHash32(digest) || !isHex(normalizeHex(signature) ?? '')) return null;
  const parts = parseSignature(signature);
  if (!parts.correctLength || !parts.validV) return null;

  try {
    const hash = mode === 'eip191' ? eip191Digest(digest) : digest;
    return await recoverAddress({ hash, signature: normalizeHex(signature)! });
  } catch {
    return null;
  }
}

export interface VerificationResult {
  valid: boolean;
  recovered: Address | null;
  parts: SignatureParts;
  /** Set when the signature is well-formed but recovery matched nobody. */
  reason: string | null;
}

/**
 * Full verification: parse, run the contract's three checks, recover, compare.
 * The `reason` field is what the UI renders when `valid` is false.
 */
export async function verifySignature(
  expectedSigner: string,
  digest: Hex,
  signature: string,
  mode: SignatureMode,
): Promise<VerificationResult> {
  const parts = parseSignature(signature);

  if (!parts.correctLength) {
    return { valid: false, recovered: null, parts, reason: 'Signature must be exactly 65 bytes.' };
  }
  if (!parts.validV) {
    return {
      valid: false,
      recovered: null,
      parts,
      reason: `Recovery id v must be 27 or 28 (got ${parts.v}).`,
    };
  }
  if (!parts.lowS) {
    return {
      valid: false,
      recovered: null,
      parts,
      reason: 'Signature is malleable: s is above half the curve order (EIP-2).',
    };
  }

  const recovered = await recoverSigner(digest, signature, mode);
  if (recovered === null) {
    return { valid: false, recovered: null, parts, reason: 'Could not recover a signer.' };
  }

  const expected = normalizeHex(expectedSigner);
  if (expected === null) {
    return { valid: false, recovered, parts, reason: 'Expected signer is not a valid address.' };
  }

  const valid = recovered.toLowerCase() === expected.toLowerCase();
  return {
    valid,
    recovered,
    parts,
    reason: valid ? null : 'Recovered address does not match the expected signer.',
  };
}
