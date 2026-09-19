# Testing

**278 automated tests across three layers, all passing.** Every number below was produced by running the suites, not estimated.

```
npm run verify        # lint + typecheck + unit + contract + production build
npm run test:unit     #  85 tests — packages/core        (Vitest)
npm run test:contracts#  41 tests — packages/contracts   (Hardhat + chai)
npm run test:e2e      # 100 tests — apps/web             (Playwright, 2 devices)
```

---

## 1. Unit tests — `packages/core` (85 passing)

Pure logic, no network, no DOM.

| File | Tests | What it pins down |
|---|---:|---|
| `hex.test.ts` | 10 | Hex validation and normalisation. Odd-length bodies, missing `0x`, uppercase `0X`, non-string inputs, unicode, and the comma/space/newline splitting the proof box relies on. |
| `merkle.test.ts` | 39 | Tree construction, proof generation and verification. |
| `signatures.test.ts` | 26 | ECDSA signing, recovery and the three contract-level checks. |
| `samples.test.ts` | 10 | Determinism and well-formedness of the simulated data. |

**Edge cases deliberately covered:** empty leaf set (rejected), single leaf (is its own root, empty proof), odd leaf counts at 3/5/7/9/11 (node promotion), duplicate leaves, mixed-case input, tampered proof elements, reordered proofs, truncated and extended proofs, foreign leaves, empty proofs against multi-leaf trees, out-of-range and non-integer indices, unicode (`🚀 日本語 café`), 100,000-character values, and a 1,000-leaf tree.

**Signature edge cases:** wrong-length signatures, `v` outside {27,28}, `v` of 0/1 normalised to 27/28, high-`s` malleable signatures, `s` exactly at the half-order boundary (accepted), empty messages, tampered signatures, wrong signer, wrong message, and invalid expected-signer input.

Three assertions exist specifically to pin the bug this project inherited: signing and verifying under **matched** modes recovers the signer, signing and verifying under **mixed** modes does not, and the EIP-191 digest differs from the raw one.

## 2. Contract tests — `packages/contracts` (41 passing)

Run against a local Hardhat network. No RPC, no deployment, no `.env` required.

| Suite | Tests | Notes |
|---|---:|---|
| `MerkleVerifier.test.js` | 19 | Root management, owner-only access, zero-root rejection, the stateless `verifyAgainstRoot` path the web app would use, single-leaf trees, and a test that **demonstrates the second-preimage property** rather than hiding it. |
| `SignatureVerifier.test.js` | 16 | Both modes, mode mismatch in both directions, malformed signatures, out-of-range `v`, a constructed **malleable high-`s` twin** `(r, n−s, v^1)` that must be rejected, and `SchemeNotImplemented` reverts for Schnorr and RSA. |
| `parity.test.js` | 6 | Differential tests — see below. |

### The parity suite

The web app computes proofs in TypeScript; the contract is what would accept or reject them on-chain. If the two ever disagreed, the app would show a proof as valid that the chain rejects. So they are pinned together over randomised input rather than a handful of hand-written vectors:

- **17 tree shapes** — 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 16, 17, 23, 32, 33, 64 leaves; powers of two, odd counts that force node promotion, and primes — with **every leaf in every tree** checked for both the folded root and the accept/reject decision. 254 leaf-proofs per run.
- **60 randomised tampered proofs**, **40 foreign leaves**, and **40 pair-hash orderings**, all requiring both implementations to agree.
- Truncated and extended proofs.
- Leaf hashing checked against `ethers.keccak256` for text, empty strings, unicode and 1,000-character input.

A deterministic PRNG seeds every case, so a failure is reproducible from the seed alone.

## 3. End-to-end — `apps/web` (100 passing)

50 specs run on **Desktop Chrome** and **Pixel 7** (100 tests). Verified against both the Node production server (`next start`) and the static export served as plain files — the suite is host-shape agnostic.

**Console watchdog.** Every test fails on any console error, uncaught exception, failed request, or HTTP ≥ 400. A page that renders but logs errors cannot pass. The single deliberate exception is the 404 test, which expects its own 404.

| Spec | Covers |
|---|---|
| `navigation.spec.ts` | All five routes' heading, title and metadata; 404; primary nav; landing cards; skip link via keyboard; browser back/forward; deep links. |
| `merkle.spec.ts` | Sample data verifying on load; tamper and restore; hand-editing the proof; stepping through all 8 leaves; custom values; single-leaf trees; the 4,096-leaf cap; unicode and long values; keyboard leaf selection; rapid clicking; refresh mid-flow. |
| `signatures.spec.ts` | Sign and verify end to end; component checks; **mode mismatch**; raw mode; wrong signer; malformed signature; changed message; new burner key; empty message; double-submit. |
| `transfers.spec.ts` | Simulated labelling; table rendering; filtering and clearing; pagination; regeneration; the real subgraph query and schema; the explanation of why it is simulated. |
| `responsive.spec.ts` | Horizontal-overflow guards at 360/768/1280 on all five routes; mobile menu; one `h1` and one `main` per route; every form control labelled; `alt` on images. |

### Bugs the E2E suite caught

Both were real, both are fixed, and both would have shipped without these tests:

1. **Hand-editing a proof crashed the page.** `processProof` throws on elements that are not 32 bytes, and the Explorer called it unconditionally to display the computed root. Typing a short value dropped the whole page into its error boundary. It is now best-effort and reports that the root is not computable.
2. **Horizontal overflow at 360px.** The tree SVG carried a hard `min-w-[320px]` that stretched its grid column past the viewport, and `Hex`'s truncating span was a flex item with the default `min-width: auto`, so a 66-character hash set the container's minimum width — `truncate` never engaged. Both now shrink; wide trees scroll inside their own box.

A third issue was found and fixed during unit testing: an uppercase `0X` prefix broke hex parsing, because `viem`'s `concatHex` strips a lowercase `0x` only. Every entry point now canonicalises its input.

---

## What is NOT tested, and why

Stated plainly rather than left for you to discover.

| Not tested | Why |
|---|---|
| **On-chain verification against a deployed contract** | No contract is deployed (your decision), and **every Ethereum RPC is blocked from the sandbox this was built in** — `infura.io`, `rpc.sepolia.org`, `publicnode`, `alchemy` all refused at the egress proxy. The code path exists behind `NEXT_PUBLIC_MERKLE_VERIFIER_ADDRESS` and is **unverified by me**. Treat it as untested until you deploy and try it. |
| **The live deployed URL** | Not deployed yet. Two independent blockers, both needing a repository admin: creating a Vercel project is forbidden for this session's credentials (HTTP 403), and GitHub Pages cannot be switched on from a workflow (`Resource not accessible by integration`). See `docs/DEPLOYMENT.md`. Everything else is verified against the real production build, locally and in CI on `main`. |
| **Wallet / MetaMask flows** | Deliberately absent. The app never asks for a wallet. |
| **Real subgraph queries and FCM push** | Cut, and the Transfer Tracker says so on the page. |
| **Cross-browser (Firefox, Safari/WebKit)** | Only Chromium is available in the build sandbox. The app uses no browser-specific APIs beyond `crypto.getRandomValues` and `navigator.clipboard`, and clipboard failures are already caught and ignored. Worth a manual check on Safari. |
| **Automated accessibility audit (axe)** | The suite checks landmarks, single `h1`, labelled controls, `alt` text and keyboard paths by hand, but does not run axe-core. Contrast was chosen deliberately, not measured programmatically. |
| **Visual regression** | No screenshot baselines. Layout is guarded by overflow assertions only. |

## Known dependency advisories

`npm audit --omit=dev` reports **zero vulnerabilities** — nothing vulnerable ships to the browser.

`npm audit` including dev dependencies reports 20, **all inside Hardhat 2's transitive tree** (`adm-zip`, `undici`, `tmp`, `serialize-javascript`, `ws`, and Hardhat's own `@metamask/eth-sig-util` chain). They are build-time only and never reach the deployed site. Clearing them means migrating to Hardhat 3, which is a different config format and test runner — deliberately out of scope here. This was 37 before the toolchain was updated.

## Verifying a deployment

The E2E suite is the deployment check, not a separate script:

```bash
BASE_URL=https://deathfire26.github.io/Merkle_Verif_BlockChain npm run test:e2e
```

When `BASE_URL` is set, Playwright starts no local server and drives the real
site. All 100 checks apply unchanged — they assert on roles and text, never on
host or port.

**A bug this caught.** The suite navigated with absolute paths (`page.goto('/merkle')`).
Playwright resolves those with `new URL(path, baseURL)`, and a leading slash
replaces the *entire* path — so against `https://host/Merkle_Verif_BlockChain`
every test silently loaded `https://host/merkle`, which does not exist. Run
against the live project site, 96 of 100 checks failed on missing pages while
the site itself was perfectly healthy.

The fix is in two places: `playwright.config.ts` normalises `BASE_URL` to end in
a slash, and `e2e/fixtures.ts` exposes `appPath()`, which strips the leading
slash so paths resolve *under* the base path. Result against the deployed
bundle: **100 passed (1.3m)**.

This is worth stating plainly because it is the failure mode the whole suite
exists to prevent — a verification step that reports green, or red, for reasons
that have nothing to do with the thing being verified.

## Differential testing against OpenZeppelin

The `standard` leaf encoding claims to reproduce OpenZeppelin's
`StandardMerkleTree`. Claims like that are exactly what this project does not
take on trust, so `@openzeppelin/merkle-tree` is a dev dependency and
`packages/core/src/leaves.test.ts` tests against the real thing.

For leaf counts 1, 2, 3, 4, 5, 7, 8, 9, 16, 17, 31 and 64 it asserts:

- the roots match;
- every proof matches OpenZeppelin's element for element;
- `StandardMerkleTree.verify` — OpenZeppelin's own verifier — accepts the proofs
  this package generates.

The odd counts are the point. The two schemes agree trivially on powers of two
and diverge everywhere else, because OpenZeppelin builds a complete binary tree
in a flat array while this project's own scheme pairs whole layers and promotes
an unpaired node. A first attempt here matched only the leaf *hashing* and
passed 1/2/4/8/16/64 while failing 3/5/7/9/17/31 — which is precisely the shape
of bug that ships when a compatibility claim is asserted instead of tested.

This sits alongside the existing TypeScript↔Solidity parity suite: two
independent differential tests, one against this project's own contract, one
against the library the ecosystem actually uses.
