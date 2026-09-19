# Deployment

**Current status: not deployed.** Everything is ready and verified locally against the real production build; the one remaining step needs an action only you can take. This document says exactly what and why.

---

## Why it is not already live

Creating a Vercel project from this session was refused:

```
Vercel API error 403
{"error":{"code":"forbidden","message":"You don't have permission to create the project.",
          "action":"create","resource":"project"}}
```

The connection can read your Vercel account fine — it lists the team (`deathfire26's projects`, Hobby) and all six existing projects, and confirms the Vercel GitHub integration is installed. It just cannot **create** a project, and the inline-deploy fallback is disabled server-side. Retried after two separate reconnects; identical result each time.

This is an account permission, not a problem with the code. The production build succeeds, and the full end-to-end suite passes against it — see `docs/TESTING.md`.

---

## Option A — Vercel (recommended, ~2 minutes)

The repository is already configured for it: `apps/web/vercel.json` pins the framework, build command and security headers, and `apps/web/package.json` has a `prebuild` step that builds the shared package first.

1. Go to [vercel.com/new](https://vercel.com/new) and import **`DeAtHfIrE26/Merkle_Verif_BlockChain`**.
2. Set **Root Directory** to `apps/web`. Leave "Include files outside the root directory" enabled — the build needs `packages/core`.
3. Framework preset: **Next.js** (auto-detected). Build and install commands come from `vercel.json`; do not override them.
4. **Add no environment variables.** The app needs none.
5. Deploy.

Preview deployments on pull requests work automatically once the repo is linked.

**Node version** is pinned to 22.x by `apps/web/package.json` `engines` and `apps/web/.nvmrc`.

### Why this fits the Hobby tier with room to spare

Every route is prerendered as static content:

```
Route (app)
┌ ○ /            ├ ○ /about      ├ ○ /merkle
├ ○ /_not-found  ├ ○ /icon.svg   ├ ○ /signatures   └ ○ /transfers
○  (Static)  prerendered as static content
```

That means **no serverless functions, no cron jobs, no database, no runtime environment variables, no background workers**. The Hobby limits that usually bite a portfolio demo — function duration, memory, the once-per-day cron cap, cold starts, an idle database being paused or deleted — simply do not apply. There is nothing here that can expire, sleep, or run up a bill.

Hobby is non-commercial only. A personal portfolio piece is within that.

> **Note on free-tier figures.** Vercel's own docs were unreachable from the sandbox this was built in (`vercel.com` is blocked by the egress proxy), so specific Hobby limits could not be verified against the primary source. The design sidesteps them by using none of the constrained resources, but do not quote numbers from this repo as authoritative.

## Option B — GitHub Pages (already wired, zero setup)

The app also builds to a fully static bundle, and `.github/workflows/pages.yml` publishes it.

- Triggers on push to `main`, or manually via **Actions → Deploy to GitHub Pages → Run workflow**.
- `actions/configure-pages` runs with `enablement: true`, so it switches Pages on by itself — no repository settings to change first.
- The resulting URL is `https://deathfire26.github.io/Merkle_Verif_BlockChain/`.
- `PAGES_BASE_PATH` handles the `/Merkle_Verif_BlockChain` subpath automatically.

One caveat: GitHub's `github-pages` environment restricts deployments to the default branch by default, so this runs once the work is merged to `main`.

Verified locally: `STATIC_EXPORT=true npm run build` produces `out/`, and the full Playwright suite passes 100/100 against that bundle served as plain files.

## Option C — anywhere else

`STATIC_EXPORT=true npm run build --workspace=apps/web` emits `out/`, which is plain HTML, CSS, JS and SVG. Drop it on Netlify, Cloudflare Pages, S3, or any static host. Set `PAGES_BASE_PATH` only if serving from a subpath.

---

## Services in use

**None.** That is the point.

| Service | Used? | Notes |
|---|---|---|
| Database | No | Nothing is persisted. |
| Auth provider | No | No accounts, no login. |
| Ethereum RPC | No | All cryptography runs in the browser. |
| The Graph | No | The Transfer Tracker is simulated and labelled as such. |
| Firebase / FCM | No | Removed; see `docs/AUDIT.md` §3.2. |
| Analytics / tracking | No | None. |

The only optional external dependency is an Ethereum RPC, and only if you later enable the on-chain verification path.

## Optional: deploying the contracts

Not required for the site to work, and **not done** — you would need a funded testnet wallet.

```bash
cp .env.example .env          # fill in SEPOLIA_RPC_URL and PRIVATE_KEY
npm run deploy:sepolia --workspace=packages/contracts
```

Use a throwaway key holding only testnet funds. Sepolia ETH is free from public faucets.

The script prints the two addresses and the exact variables to set. Adding `NEXT_PUBLIC_MERKLE_VERIFIER_ADDRESS` and `NEXT_PUBLIC_CHAIN_ID` in Vercel (Production and Preview) enables the on-chain verification panel in the Merkle Explorer.

**This path is untested.** Every Ethereum RPC was blocked from the build sandbox, so it has never been exercised end to end. Treat it as unverified until you run it.

## Redeploying

Push to `main`. Vercel rebuilds on every push once linked; the Pages workflow runs on the same trigger. Pull requests get Vercel preview deployments automatically.

To roll back on Vercel: **Deployments → the last good one → Promote to Production**.

## Build commands reference

| Command | What it does |
|---|---|
| `npm ci` | Clean install from the lockfile (what CI runs). |
| `npm run verify` | lint + typecheck + unit + contract tests + production build. |
| `npm run build` | Builds `packages/core`, then the Next.js app. |
| `npm run test:e2e` | Playwright against a local production server. |
| `BASE_URL=https://… npm run test:e2e` | **Runs the same suite against a deployed URL.** Use this after the first deploy. |
