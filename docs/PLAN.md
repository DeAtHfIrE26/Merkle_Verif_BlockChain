# Phase 1 — Build Plan

**Decisions confirmed by owner (all defaults accepted, 2026‑09‑18):** rotate the Infura key without rewriting history · rebuild as one product · USDC tracker becomes clearly‑labelled simulated mode · no Schnorr/RSA, fix the docs and the ECDSA bug instead · no live Sepolia deploy · remove phone number · repo stays public under the same name · Vercel project `merkle-verif-blockchain` linked to GitHub.

---

## 1. What we're building

**Merkle Verify — a browser-native blockchain verification toolkit.** One Next.js app, three tools, zero credentials required to use it:

1. **Merkle Proof Explorer** — build a tree from a leaf set, visualise it, pull any leaf's proof, verify it, then *tamper* with the proof and watch it fail. The tamper interaction is the demo: it shows the reader what a proof actually guarantees.
2. **Signature Verifier** — generate a burner key in‑browser, sign a message, recover the signer. Shows **EIP‑191 prefixed vs raw‑hash** recovery side by side — which is precisely the bug the old `signature-verifier` test tripped over. The app teaches the pitfall that broke the original code.
3. **Transfer Tracker (Simulated)** — deterministic seeded USDC feed with a persistent "Simulated data" badge, plus the real subgraph GraphQL query shown as code.

**Why this shape:** Merkle proofs and signature recovery are *pure computation*. No RPC, no database, no API key, no cold start, nothing to expire. A recruiter with no wallet sees it work in under five seconds, and it cannot rot when a free tier changes terms.

---

## 2. Architecture

npm workspaces monorepo, Node 22 pinned via `.nvmrc` + `engines`:

```
apps/web/            Next.js 15 App Router + TypeScript + Tailwind v4  → Vercel
packages/core/       Framework-free TS crypto: Merkle build/prove/verify, sig recovery
packages/contracts/  Hardhat: MerkleVerifier.sol + SignatureVerifier.sol
docs/                AUDIT.md, PLAN.md, TESTING.md, DEPLOYMENT.md
```

**Key architectural bet — `packages/core` is shared by the web app *and* the contract tests.** The same TypeScript that renders the UI is differentially tested against the Solidity implementation: thousands of randomised trees, both implementations must agree on every proof. That turns two disconnected demos into one verifiable claim, and it's the thing worth talking about in an interview.

**Library choices, one line each:**
- **Next.js 15 + TypeScript** — Vercel-native zero-config, matches your React day-job stack, and TS is table stakes for a portfolio repo.
- **Tailwind v4** — design tokens live in CSS, no config file to drift, tiny output.
- **viem** (web) — modern, tree-shakeable, excellent types; ~10× smaller than ethers for the few primitives we need.
- **ethers v6 + `@nomicfoundation/hardhat-ethers` + `hardhat-chai-matchers`, chai 4** (contracts) — replaces the abandoned Waffle stack that causes the current `npm install` failure. Chai pinned to 4 because 5 is ESM-only and breaks CommonJS Hardhat tests.
- **`@openzeppelin/contracts` pinned to 4.9.6** — the contract's `Ownable` has no constructor arg, which OZ v5 requires. Pinning is correct here; migrating to v5 is scope we don't need.
- **Vitest** (unit), **Playwright** (E2E) — both fast, both first-class on Vercel/CI.
- **solc from npm + `TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD` override** — `binaries.soliditylang.org` is egress-blocked here; the identical compiler ships on npm. Verified working in Phase 0.

---

## 3. Design direction

Dark-first, near-black `#0A0B0D` — deliberately not CRA's `#282c34`. **Semantic colour is load-bearing and therefore reserved:** emerald = valid, rose = invalid, and the brand accent is **indigo‑violet** so it can never be confused with a verification result. Neutral slate ramp for everything else.

**Type:** Inter variable for UI, JetBrains Mono for all hex — hashes get tabular figures and explicit `letter-spacing` so 64‑char digests stay scannable and truncate predictably. Modular scale ≈1.25, 4px spacing grid, generous line-height in prose.

**Motion:** 150–200ms ease-out on state transitions only; the tree visualisation animates node-by-node on build. All of it behind `prefers-reduced-motion`.

**States, designed not bolted on:** skeleton loaders, empty states that offer a "Load sample" CTA rather than a dead box, inline field validation with `aria-live` results, an error boundary, and a real 404. First screen gets the most attention — hero + live tree visualisation above the fold, no dead space, working on a 360px phone.

**Accessibility:** semantic landmarks, full keyboard nav, visible focus rings, every input labelled, verification results announced via `aria-live`, contrast ≥ 4.5:1 throughout.

---

## 4. Deployment target

**Vercel Hobby**, project `merkle-verif-blockchain`, linked to the GitHub repo with `rootDirectory: apps/web` — git linkage gives PR preview deploys for free. The app is static + client-side: **no serverless functions, no cron, no database, no env vars required at runtime.** That sidesteps every Hobby limit I flagged in the audit (function duration, once-daily cron, cold starts) and there is no free tier that can lapse and take the demo down. Hobby's non-commercial clause is satisfied by a personal portfolio piece.

---

## 5. Work items

| # | Intent | Files | How I verify |
|---|---|---|---|
| **P2.1** | Remove the committed Infura ID and the credential-shaped Firebase file | `signature-verifier/hardhat.config.js`, `usdc-transfer-tracker/backend/firebaseServiceAccount.json` | `git grep` for the key returns only history, not the tree |
| **P2.2** | Add `.gitignore` (node_modules, .env*, artifacts, cache, .next, coverage, playwright-report) and `.env.example` with names+descriptions only | root | `git status` clean after a full install + build |
| **P2.3** | Delete junk: 952 KB unused `logo.png`, dead `fetchTransactions.js`, zero-byte `frontend/package.json`, doubled `usdc-transfer-tracker/usdc-transfer-tracker/` | per audit §7 | repo size drops; nothing references the removed paths |
| **P3.1** | Scaffold workspaces, pin Node 22, wire `lint`/`typecheck`/`test`/`build` as real scripts at root | `package.json`, `.nvmrc`, `tsconfig.base.json`, ESLint + Prettier | all four scripts exit 0 from a clean clone |
| **P3.2** | Build `packages/core`: Merkle build/prove/verify, hex validation, signature recovery (both EIP‑191 and raw) | `packages/core/src/**` | Vitest suite green |
| **P3.3** | Fix and modernise `packages/contracts`: correct deps, remove env-var requirement for local compile, npm-solc override | `packages/contracts/**` | `npm test` compiles and passes with **no `.env` present** |
| **P4.1** | **Fix the ECDSA bug.** Contract accepts an explicit prefixed/raw mode; test the happy path for real | `SignatureVerifier.sol`, tests | a test that asserts `true` and would fail if recovery broke |
| **P4.2** | **Differential tests:** randomised trees, TS `core` vs Solidity must agree | `packages/contracts/test/parity.test.ts` | ≥1,000 random cases, both implementations agree |
| **P4.3** | Merkle Proof Explorer UI incl. tree visualisation + tamper mode | `apps/web/app/merkle/**` | Playwright click-through; manual sweep |
| **P4.4** | Signature Verifier UI incl. burner key, EIP‑191 vs raw comparison | `apps/web/app/signatures/**` | Playwright; recovered address matches signer |
| **P4.5** | Transfer Tracker (Simulated) with permanent badge + real query shown | `apps/web/app/transfers/**` | badge present in DOM; no network calls made |
| **P4.6** | Shell: landing page, nav, 404, error boundary, loading/empty states, responsive 360/768/1280, a11y pass | `apps/web/app/**`, `components/**` | axe scan clean; manual sweep at three widths |
| **P5.1** | Unit + integration tests, edge cases (empty, single leaf, odd counts, duplicates, unicode, malformed hex, huge inputs) | `packages/core/**` | coverage on core logic |
| **P5.2** | Playwright E2E across all flows, **failing the run on any console error or asset 404** | `apps/web/e2e/**` | green against local |
| **P5.3** | Write `docs/TESTING.md` — covered, passed, and what I couldn't test and why | `docs/TESTING.md` | honest record incl. the RPC-blocked gaps |
| **P6.1** | Create Vercel project, link GitHub, `rootDirectory: apps/web`, enable PR previews | Vercel MCP | production build succeeds |
| **P7.1** | Re-run E2E **against the production URL**; manual sweep incl. mobile viewport; check HTTPS, favicon, titles, OG tags, cold cache | — | suite green against prod; loop until clean |
| **P8.1** | Rewrite README for recruiter + developer; delete the four bloated READMEs; remove phone number | `README.md` | no invented metrics, no unmeasured benchmarks |
| **P8.2** | `docs/DEPLOYMENT.md`; open PR | `docs/**` | PR opened against `main` |

---

## 6. Deliberately cut

- **Schnorr and RSA** — documented as future work rather than shipped as `return false` behind a README claiming "Universal Compatibility".
- **Firebase Cloud Messaging + the Express poller** — needs a Google account, a real device token, and an always-on process. Can't be demoed by a stranger; can't run on Hobby cron.
- **The Graph subgraph deployment** — needs a wallet and an API key; the tracker's real query is shown as code instead.
- **Live Sepolia contract deployment** — no RPC reachable from here and it needs your wallet. The optional on-chain verify path stays wired behind a config value you can fill in later.

## 7. Risks I'm carrying

- **I cannot exercise any live-chain path from this sandbox.** Every RPC is blocked. Mitigated by design — the product's core is pure computation — but it's why on-chain verify ships as optional and untested-by-me, and `TESTING.md` will say so.
- **Vercel free-tier figures remain unverified** (docs egress-blocked). Mitigated by needing none of the constrained resources: no functions, no cron, no DB.
- **The Infura key stays in git history.** Rotation by you is what actually neutralises it; removing it from the tree is cosmetic until then.
