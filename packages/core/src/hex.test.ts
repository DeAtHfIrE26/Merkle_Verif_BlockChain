import { describe, expect, it } from 'vitest';
import { isHash32, isHex, isHexOfLength, normalizeHex, splitHexList, truncateHex } from './hex.js';

describe('isHex', () => {
  it('accepts well-formed hex', () => {
    expect(isHex('0x')).toBe(true);
    expect(isHex('0xdeadbeef')).toBe(true);
    expect(isHex('0xDEADBEEF')).toBe(true);
  });

  it('rejects odd-length bodies, missing prefix and non-hex digits', () => {
    expect(isHex('0xabc')).toBe(false);
    expect(isHex('deadbeef')).toBe(false);
    expect(isHex('0xzz')).toBe(false);
    expect(isHex('0x 12')).toBe(false);
  });

  it('rejects non-strings without throwing', () => {
    for (const v of [null, undefined, 42, {}, [], true]) {
      expect(isHex(v)).toBe(false);
    }
  });
});

describe('isHexOfLength / isHash32', () => {
  it('measures bytes, not characters', () => {
    expect(isHexOfLength('0xdeadbeef', 4)).toBe(true);
    expect(isHexOfLength('0xdeadbeef', 3)).toBe(false);
    expect(isHash32(`0x${'11'.repeat(32)}`)).toBe(true);
    expect(isHash32(`0x${'11'.repeat(31)}`)).toBe(false);
    expect(isHash32(`0x${'11'.repeat(33)}`)).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('adds a missing prefix, trims, and lowercases', () => {
    expect(normalizeHex('  DEADBEEF ')).toBe('0xdeadbeef');
    expect(normalizeHex('0XDEADBEEF')).toBe('0xdeadbeef');
  });

  it('returns null for empty and malformed input', () => {
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('   ')).toBeNull();
    expect(normalizeHex('0x')).toBeNull();
    expect(normalizeHex('nonsense')).toBeNull();
    expect(normalizeHex('0xabc')).toBeNull();
  });

  it('does not mangle unicode input, it rejects it', () => {
    expect(normalizeHex('0xdead🚀beef')).toBeNull();
    expect(normalizeHex('日本語')).toBeNull();
  });
});

describe('splitHexList', () => {
  it('splits on commas, spaces and newlines alike', () => {
    const expected = ['0xaa', '0xbb', '0xcc'];
    expect(splitHexList('0xaa,0xbb,0xcc')).toEqual(expected);
    expect(splitHexList('0xaa 0xbb 0xcc')).toEqual(expected);
    expect(splitHexList('0xaa\n0xbb\n0xcc')).toEqual(expected);
    expect(splitHexList(' 0xaa ,\n 0xbb,  0xcc \n')).toEqual(expected);
  });

  it('returns an empty list for blank input', () => {
    expect(splitHexList('')).toEqual([]);
    expect(splitHexList('  \n , ')).toEqual([]);
  });
});

describe('truncateHex', () => {
  it('abbreviates long values and leaves short ones alone', () => {
    expect(truncateHex(`0x${'ab'.repeat(32)}`)).toBe('0xabab…abab');
    expect(truncateHex('0xabcd')).toBe('0xabcd');
  });
});
