# Deployment

**Current status: live at [deathfire26.github.io/Merkle_Verif_BlockChain](https://deathfire26.github.io/Merkle_Verif_BlockChain/).**

Served by GitHub Pages from the `gh-pages` branch ("Deploy from a branch" source, `/ (root)`).
`.github/workflows/pages-branch.yml` rebuilds and republishes that branch on every push to `main`,
so the site tracks the default branch with no further action.

Verified against the deployed bundle rather than assumed:

```bash
BASE_URL=https://deathfire26.github.io/Merkle_Verif_BlockChain npm run test:e2e
# 100 passed (1.3m)
```

Cost: zero, permanently. GitHub Pages is free for public repositories, the site is
static, and nothing here can expire, sleep, or bill.

---

## Why GitHub Pages and not Vercel

Vercel was the original target. Creating a project from the build session was refused:

```
Vercel API error 403
{"error":{"code":"forbidden","message":"You don't have permission to create the project.",
          "action":"create","resource":"project"}}
```

The connection can read your Vercel account fine — it lists the team (`deathfire26's projects`, Hobby) and all six existing projects, and confirms the Vercel GitHub integration is installed. It just cannot **create** a project, and the inline-deploy fallback is disabled server-side. Retried after two separate reconnects; identical result each time.

This is an account permission, not a problem with the code. Rather than block on it, the app ships on GitHub Pages, which costs nothing and needs no third-party account. The Vercel route below still works if you ever want it — nothing about the codebase is Pages-specific.

---

## Option A — Vercel (alternative, ~2 minutes)

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

## Option B — GitHub Pages (what is live today)

The app builds to a fully static bundle, so Pages can host it for free and forever. There are two routes to it, and **both are already wired up**. Pick either; only one Pages source can be active at a time, so they cannot fight over the live site.

### Why a setting is needed at all

Pages had to be switched on by hand once, because **a workflow cannot switch it on**. Creating a Pages site needs admin scope, which the automatic `GITHUB_TOKEN` does not have even when the workflow grants `pages: write`. An earlier version of `pages.yml` used `actions/configure-pages` with `enablement: true` expecting it to self-enable; every run failed at the same step:

```
Get Pages site failed.    Error: Not Found
Create Pages site failed. Error: Resource not accessible by integration
```

Driving the Pages REST API directly from the build sandbox was also refused — `403 Access to this GitHub API path is not permitted through this proxy` — so there is no way around the manual step from here. It is genuinely one click; it just has to be *your* click.

### Route 1 — branch source (**this is the one in use**)

`.github/workflows/pages-branch.yml` builds the static export and commits it to the **`gh-pages`** branch using the ordinary `contents: write` token. No Pages API is involved, so nothing can fail the way `pages.yml` does.

Settings, for the record: **Source** "Deploy from a branch", **Branch** `gh-pages`, folder `/ (root)`.

The workflow re-publishes the branch on every push to `main`, so the site stays current without further attention. `.nojekyll` is written into the branch because Pages runs Jekyll on branch sources and Jekyll silently drops `_next/`.

### Route 2 — GitHub Actions source

`.github/workflows/pages.yml` uploads a Pages artifact and deploys it directly, which skips the `gh-pages` branch entirely and is the more modern route.

> **Settings → Pages → Build and deployment → Source: "GitHub Actions"**

Then re-run **Actions → Deploy to GitHub Pages → Run workflow**. After that, every push to `main` publishes automatically.

### Either way

- The URL is `https://deathfire26.github.io/Merkle_Verif_BlockChain/`.
- `PAGES_BASE_PATH` handles the `/Merkle_Verif_BlockChain` subpath automatically; the committed `gh-pages` build already has it baked in.
- GitHub's `github-pages` environment restricts deployments to the default branch, so Route 2 publishes from `main`.

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

Push to `main`. Vercel rebuilds on every push once linked; both Pages workflows run on the same trigger. Pull requests get Vercel preview deployments automatically.

To roll back on Vercel: **Deployments → the last good one → Promote to Production**.

## Build commands reference

| Command | What it does |
|---|---|
| `npm ci` | Clean install from the lockfile (what CI runs). |
| `npm run verify` | lint + typecheck + unit + contract tests + production build. |
| `npm run build` | Builds `packages/core`, then the Next.js app. |
| `npm run test:e2e` | Playwright against a local production server. |
| `BASE_URL=https://… npm run test:e2e` | **Runs the same suite against a deployed URL.** Use this after the first deploy. |

Subpath deployments work: `BASE_URL=https://deathfire26.github.io/Merkle_Verif_BlockChain npm run test:e2e` runs all 100 checks against the project site. A trailing slash is optional — the config adds one, because `new URL('/merkle', 'https://host/Repo')` resolves to `https://host/merkle` and would otherwise test the wrong origin silently.
