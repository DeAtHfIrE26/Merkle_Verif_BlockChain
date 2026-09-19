import { LEAF_ENCODINGS, type LeafEncoding } from '@merkle-verify/core';

/**
 * Explorer state that survives a link.
 *
 * The site is a static export with no backend, so a shared tree has to travel
 * inside the URL itself. Values are base64url-encoded rather than percent-
 * encoded because a list of hashes is mostly `0`-`f` and percent-encoding the
 * newlines alone roughly doubles it.
 */
export interface ShareState {
  values: string;
  encoding: LeafEncoding;
  index: number;
}

/**
 * Longest query string worth producing.
 *
 * Browsers cope with far more, but chat apps, mail clients and issue trackers
 * wrap or truncate long links, and a silently broken link is worse than an
 * honest "this tree is too big to share".
 */
export const MAX_SHARE_LENGTH = 1800;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  // Chunked rather than spread: a large allowlist would blow the call stack.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

const isEncoding = (value: string): value is LeafEncoding =>
  LEAF_ENCODINGS.some((e) => e.id === value);

/**
 * Build the query string for `state`, or null when it would be too long to
 * share reliably.
 */
export function encodeShareState(state: ShareState): string | null {
  const params = new URLSearchParams();
  params.set('v', toBase64Url(state.values));
  params.set('e', state.encoding);
  if (state.index > 0) params.set('i', String(state.index));
  const query = params.toString();
  return query.length > MAX_SHARE_LENGTH ? null : query;
}

/**
 * Read whatever of `ShareState` a query string carries.
 *
 * Every field is optional and independently validated: a link someone hand-
 * edited should degrade to defaults, never throw on the way into a render.
 */
export function decodeShareState(search: string): Partial<ShareState> {
  const params = new URLSearchParams(search);
  const state: Partial<ShareState> = {};

  const rawValues = params.get('v');
  if (rawValues) {
    const decoded = fromBase64Url(rawValues);
    if (decoded !== null) state.values = decoded;
  }

  const rawEncoding = params.get('e');
  if (rawEncoding && isEncoding(rawEncoding)) state.encoding = rawEncoding;

  const rawIndex = params.get('i');
  if (rawIndex) {
    const index = Number.parseInt(rawIndex, 10);
    if (Number.isInteger(index) && index >= 0) state.index = index;
  }

  return state;
}

/** The absolute URL for `state`, or null when it will not fit. */
export function shareUrl(state: ShareState): string | null {
  if (typeof window === 'undefined') return null;
  const query = encodeShareState(state);
  if (query === null) return null;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?${query}`;
}


/**
 * The query string, as an external store React can read safely.
 *
 * The page is prerendered without a query string, so the server snapshot is
 * always empty and the client's first render matches the HTML; React then
 * swaps in the real value. The client snapshot is cached because
 * `getSnapshot` must be stable between renders -- and because the Explorer
 * writes its own state back with `replaceState`, an uncached read would see
 * that write and remount the component on every keystroke.
 *
 * `popstate` (back/forward) clears the cache, so navigation still works.
 */
let cachedSearch: string | null = null;

export function subscribeToSearch(onChange: () => void): () => void {
  const handler = () => {
    cachedSearch = null;
    onChange();
  };
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}

export function getSearchSnapshot(): string {
  if (cachedSearch === null) cachedSearch = window.location.search;
  return cachedSearch;
}

/** Prerendered HTML never carries a query string. */
export function getServerSearchSnapshot(): string {
  return '';
}
