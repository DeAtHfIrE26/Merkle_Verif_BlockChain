/**
 * Hex validation and formatting helpers.
 *
 * Every public entry point in this package validates its hex input here rather
 * than trusting callers. The UI passes user-typed strings straight through, so
 * "looks like a hash" is never assumed.
 */

export type Hex = `0x${string}`;

const HEX_BODY = /^[0-9a-fA-F]*$/;

/** True if `value` is 0x-prefixed hex with an even number of digits. */
export function isHex(value: unknown): value is Hex {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('0x')) return false;
  const body = value.slice(2);
  return body.length % 2 === 0 && HEX_BODY.test(body);
}

/** True if `value` is hex encoding exactly `bytes` bytes. */
export function isHexOfLength(value: unknown, bytes: number): value is Hex {
  return isHex(value) && value.length === 2 + bytes * 2;
}

/** True if `value` is a 32-byte hex string — the shape of a keccak256 digest. */
export function isHash32(value: unknown): value is Hex {
  return isHexOfLength(value, 32);
}

/** True if `value` is a 20-byte hex string — the shape of an EVM address. */
export function isAddressLike(value: unknown): value is Hex {
  return isHexOfLength(value, 20);
}

/**
 * Normalise user input into canonical lowercase hex.
 *
 * Accepts surrounding whitespace and a missing 0x prefix, because both are
 * common when pasting from a block explorer. Returns null when the input
 * cannot be read as hex — callers surface that as a validation message.
 */
export function normalizeHex(input: string): Hex | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const withPrefix = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : `0x${trimmed}`;
  const body = withPrefix.slice(2);
  if (body.length === 0 || body.length % 2 !== 0 || !HEX_BODY.test(body)) return null;
  return `0x${body.toLowerCase()}` as Hex;
}

/** Abbreviate a long hex string for display: 0x1234…cdef. */
export function truncateHex(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/**
 * Split a comma-, whitespace- or newline-separated list into hex entries.
 * Used for the proof input, where people paste in all three shapes.
 */
export function splitHexList(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
