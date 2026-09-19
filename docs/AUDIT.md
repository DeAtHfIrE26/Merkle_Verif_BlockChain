# Phase 0 — Repository Audit

**Repo:** [DeAtHfIrE26/Merkle_Verif_BlockChain](https://github.com/DeAtHfIrE26/Merkle_Verif_BlockChain) (**public**, default branch `main`, 14 commits, last push 2024‑11‑23)
**Audited:** 2026‑09‑18 · read‑only pass, no files modified
**Method:** every tracked file read; installs/compiles/tests actually executed in a scratch copy; git history scanned for secrets. Findings below are labelled **verified** (I ran it) or **inferred** (read‑only reasoning).

---

## 1. What this project actually is

Three unrelated blockchain assignments parked in one repo. The READMEs call them "Task 1 / Task 2 / Task 3" and the clone URLs inside them still point at `github.com/DeAtHfIrE26/charter-21BCE0216` — so this began as a company take‑home ("charter") tied to a student ID (21BCE0216), later renamed. That origin explains the shape: three disjoint proofs‑of‑concept, no shared code, no shared build, no product.

| Directory | What it does |
|---|---|
| `merkle-proof-verification/` | Solidity contract holding a Merkle root; verifies that a tx hash is a leaf of that tree via a sorted‑pair proof. Hardhat scripts pull a block's transactions from an RPC, build the tree, and push the root on‑chain. A React page lets a MetaMask user paste a hash + proof and verify. |
| `usdc-transfer-tracker/` | A Graph subgraph indexing USDC `Transfer` events on Sepolia, an Express service polling that subgraph and firing Firebase Cloud Messaging pushes, and a React table of recent transfers. |
| `signature-verifier/` | Solidity contract exposing one `verifySignature(signer, signature, hash, scheme)` entry point, intended to dispatch across ECDSA / Schnorr / RSA. |

**The honest one‑liner:** three partial demos of "can you prove this thing is authentic on‑chain" — Merkle inclusion, event indexing, signature recovery. There is no user‑facing product here today, and nothing has ever been deployed.

---

## 2. Stack inventory

- **Languages:** Solidity (0.8.0 / 0.8.18), JavaScript (CommonJS for tooling, JSX for UI), AssemblyScript (subgraph mapping), GraphQL (schema).
- **Contract tooling:** Hardhat 2.x + `@nomiclabs/hardhat-waffle` + `@nomiclabs/hardhat-ethers` (the pre‑2023 Waffle stack; the maintained path is now `hardhat-toolbox` + `hardhat-chai-matchers`).
- **Frontends:** Create React App (`react-scripts` 5.0.1), React 18.2. CRA has been unmaintained since early 2025.
- **Backend:** Express 4, `node-cron`, `firebase-admin` 11, `axios`.
- **Package manager:** npm. **Node used for this audit:** v22.22.2, npm 10.9.7.
- **Lockfiles:** exactly one — `merkle-proof-verification/package-lock.json` (v3, 613 packages). The other three npm projects ship **no lockfile**, so their installs are unpinned and non‑reproducible.
- **Absent everywhere:** `.gitignore`, `.env.example`, linter, formatter, TypeScript, CI, tests for anything that isn't a contract.

---

## 3. Completeness map

### 3.1 `merkle-proof-verification/` — the only salvageable core

| Item | State | Notes |
|---|---|---|
| `contracts/MerkleVerifier.sol` | **Working** | Clean, small, correct. Sorted‑pair verification matches `merkletreejs({sortPairs:true})` — **verified** by running the suite. |
| `test/MerkleVerifier.js` | **Working** | 8 tests, **all 8 pass** once missing deps are installed (verified). Genuinely covers empty proof, malformed proof, wrong root, owner‑only access, event emission. This is the best asset in the repo. |
| `scripts/deploy.js` | **Half‑built** | Fine logic, but needs env vars that nothing documents. |
| `scripts/generateMerkleTree.js` | **Half‑built** | Real logic, but `blockNumber = 1234567` is a hardcoded placeholder and the file is a bare IIFE — it executes on import, so it can't be reused as a module. |
| `scripts/fetchTransactions.js` | **Dead code** | Its `fetchTransactions` is duplicated verbatim inside `generateMerkleTree.js`; nothing imports this file. |
| `scripts/setMerkleRoot.js` | **Referenced‑but‑missing** | Reads `scripts/merkleData.json`, which is never committed and only appears if you first run the generator against a live RPC. |
| `frontend/package.json` | **Missing (0 bytes)** | The file exists and is **empty**. The frontend cannot install or build at all. |
| `frontend/public/index.html` | **Missing** | Required by CRA. |
| `frontend/src/index.js` | **Missing** | Required by CRA. No React root is ever mounted. |
| `frontend/src/App.js` | **Stubbed at the edges** | Logic is reasonable, but `process.env.REACT_APP_CONTRACT_ADDRESS` is undefined everywhere, so `new ethers.Contract(undefined, …)` throws on load. Errors surface via `alert()`. No loading, empty, or error state. |
| `frontend/public/logo.png` | **Junk** | 952 KB, 1024×1024, referenced by nothing. |

**Bottom line:** the contract and its tests are solid; the frontend around them does not exist in a runnable form.

### 3.2 `usdc-transfer-tracker/` — furthest from working

| Item | State | Notes |
|---|---|---|
| `usdc-transfer-tracker/subgraph.yaml` | **Stubbed** | `address: "0xMockUSDCContractAddress1234567890abcdef"` is not a valid 40‑hex address. This subgraph has never been deployable, let alone deployed. |
| `.../src/mapping.ts` | **Stubbed** | Filters on `"0xYourTargetAddress1234567890abcdef1234567890abcdef"` — a 48‑hex placeholder, also invalid. Imports `../generated/…`, which only exists after `graph codegen` runs. |
| `.../abis/USDC.json` | **Half‑built** | Hand‑trimmed to 3 entries. Has the `Transfer` event the mapping needs, so it is workable, but it is not the real USDC ABI. |
| Subgraph `package.json` | **Referenced‑but‑missing** | The README tells you to `cd subgraph && npm install`; there is no `subgraph/` directory (the folder is `usdc-transfer-tracker/usdc-transfer-tracker/`) and no package.json in it. |
| `backend/index.js` | **Broken at runtime** | Three independent failures — see §4. |
| `backend/firebaseServiceAccount.json` | **Junk / bad practice** | Placeholder values only (no live key — **verified**), but a credential‑shaped file committed to a public repo. |
| `frontend/src/Dashboard.js` | **Broken at runtime** | Calls `ethers.utils.formatUnits` while `package.json` pins `ethers@^6` — `ethers.utils` is `undefined` in v6 (**verified**). Every row throws on render. |
| `frontend/src/api.js` | **Stubbed** | Backend URL hardcoded to `http://localhost:3001`. In production this is both wrong and mixed‑content‑blocked. |
| `frontend/public/index.html` | **Referenced‑but‑missing asset** | Links `favicon.ico`, which isn't in the repo → guaranteed 404. |
| Push notifications | **Stubbed** | `const tokens = ['dummytoken1234567890abcdef']` — hardcoded fake FCM token. Notifications have never been sent to a real device. |

### 3.3 `signature-verifier/` — the honesty problem

| Item | State | Notes |
|---|---|---|
| `contracts/SignatureVerifier.sol` | **1 of 3 schemes implemented** | ECDSA is real and decent: length check, `s` malleability guard (EIP‑2), `v ∈ {27,28}`. **Schnorr and RSA are `return false;` with a "implement here" comment.** |
| `test/SignatureVerifier.test.js` | **Failing** | **Verified: 3 pass, 1 fails.** |
| `hardhat.config.js` | **Contains a credential** | See §6. |
| Lockfile | **Missing** | And `npm install` fails outright — see §4. |

**This is the most important finding in the repo.** The failing test is `Should verify a valid ECDSA signature` — the *only* test asserting the happy path. The cause: the test signs with `signer.signMessage(...)`, which applies the EIP‑191 `"\x19Ethereum Signed Message:\n32"` prefix, while the contract calls `ecrecover(signedHash, …)` on the **raw, unprefixed** hash. The recovered address never matches.

The remaining three tests all assert `expect(isValid).to.equal(false)` — and this contract returns `false` for essentially any input it doesn't like, including every input it fails to handle. **They pass vacuously.** So the suite reports "3 passing" while the feature has never once been demonstrated to work. Anyone who runs `npm test` here sees a red build; anyone who reads only the README sees "Comprehensive Testing".

Meanwhile the README advertises "**Universal Compatibility**: Supports multiple signature schemes such as ECDSA, Schnorr, and RSA" — two of those three are `return false`.

---

## 4. Runnability — can it install and boot as‑is?

**No. None of the four npm projects runs from a clean clone.** All failures below were reproduced in a scratch copy.

**`merkle-proof-verification/`** — `npm ci` succeeds (576 packages), then:
1. `npx hardhat compile` → `Error: Cannot find module 'dotenv'`. **Four packages the code requires are absent from `package.json` and the lockfile:** `dotenv`, `@openzeppelin/contracts` (imported by the contract), `merkletreejs`, `keccak256` (both imported by the tests and scripts).
2. After installing those → `HH8: Invalid value undefined for HardhatConfig.networks.sepolia.url`. The config reads `process.env.SEPOLIA_RPC_URL` / `PRIVATE_KEY` unconditionally, so **you cannot compile or test locally without a `.env` holding a real private key** — a hard blocker for any contributor and for CI.
3. After neutralising the config → compiles and **8/8 tests pass**.

*Also inferred:* the contract uses OpenZeppelin v4 `Ownable` (no constructor arg) and the test asserts the v4 revert string `"Ownable: caller is not the owner"`. Under OZ v5 the contract won't compile and that assertion is wrong. Nothing pins the version, so a fresh `npm i @openzeppelin/contracts` today installs v5 and breaks. I pinned 4.9.6 to get the suite green.

**`signature-verifier/`** — `npm install` **fails immediately**:
```
npm error ERESOLVE unable to resolve dependency tree
npm error Found: ethers@6.17.0  (dev ethers@"^6.6.1" from the root project)
npm error Could not resolve dependency:
npm error peer ethers@"^5.0.0" from @nomiclabs/hardhat-ethers@2.2.3
```
`package.json` asks for ethers v6 while the Waffle toolchain requires v5, and the test file uses v5 syntax (`ethers.utils.*`). Forcing ethers 5.7.2 makes it install, compile, and run — at which point it fails 1/4 as described.

**`usdc-transfer-tracker/backend/`** — installs, then dies on boot before serving anything:
1. `require(process.env.FIREBASE_CREDENTIALS)` with the var unset → `require(undefined)` throws at module load.
2. `process.env.TARGET_ADDRESS.toLowerCase()` → `TypeError: Cannot read properties of undefined` if unset.
3. Even past those, `ethers.utils.formatUnits` is `undefined` under the pinned ethers v6 (**verified**) — so every notification path throws.
4. `fcm.sendToDevice()` is a legacy API removed in `firebase-admin` v13+ (*inferred*; v11 is pinned so it still exists, but it is deprecated).

**`usdc-transfer-tracker/frontend/`** — installs and would boot, but renders a table that throws on every row (ethers v6 issue above), pointed at a `localhost` backend.

**`merkle-proof-verification/frontend/`** — cannot even be installed. `package.json` is a zero‑byte file.

### Environment constraint discovered during the audit
This sandbox's egress allowlist blocks nearly everything this repo needs. **Verified reachable:** `registry.npmjs.org`, `api.github.com`, `fonts.googleapis.com`. **Verified blocked:** every Ethereum RPC tried (`sepolia.infura.io`, `rpc.sepolia.org`, `publicnode`, `alchemy`), `thegraph.com`, `firebase.google.com`, `vercel.com`, and `binaries.soliditylang.org`.

Two consequences that shape the plan:
- **Solidity compilation still works** — the identical compiler ships on npm as `solc`, and Hardhat supports it through the `TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD` subtask. Verified: contracts compile and tests run this way.
- **I cannot exercise any live‑chain feature from here.** Anything requiring an RPC, a subgraph, or FCM is untestable by me end‑to‑end — which is a strong argument for making the demo's core path pure client‑side computation that needs no network at all.
- **Vercel deployment is still possible:** the Vercel MCP tooling reaches the API over a separate channel. Verified — your account resolves as **`deathfire26's projects`, Hobby plan**, with 6 existing projects.

---

## 5. External dependencies & free‑tier reality

> **Caveat, stated plainly:** provider docs (`vercel.com`, `thegraph.com`, `firebase.google.com`) are **blocked from this sandbox**, so I could not verify current terms against the primary source as the brief asks. The figures below come from web search results dated 2026 and are marked with confidence. **Anything marked ⚠️ should be confirmed by you before we rely on it.** I would rather flag this than quote numbers as verified when they aren't.

| Dependency | Used by | Free tier for a portfolio demo? | Confidence |
|---|---|---|---|
| **Ethereum RPC (Sepolia)** | Merkle scripts, both frontends | Yes — Infura/Alchemy free tiers, or public endpoints with no key. Sepolia ETH is free from faucets. | High |
| **The Graph** | USDC subgraph | Hosted Service was **fully deprecated**; The Graph Network requires an API key, free tier ~100k queries/month. Studio deploys need a wallet. ⚠️ | Medium |
| **Firebase Cloud Messaging** | Backend pushes | FCM itself is free on the Spark plan, but requires a Google account + service‑account key, and needs a real device token to demonstrate. | Medium |
| **Vercel Hobby** | Deployment target | Free. Reported 2026 Hobby limits: 100 GB bandwidth, 6,000 build minutes, 45‑min max build, ~1M function invocations. **Cron on Hobby is capped at once‑per‑day** — search results conflict on max function duration (10s vs 300s). ⚠️ | Low–Medium |
| **Vercel commercial clause** | — | Hobby is **non‑commercial only**. A personal portfolio is fine; anything revenue‑generating is not. ⚠️ | Medium |

**The decisive point:** the USDC tracker's architecture is the exact shape Vercel Hobby is worst at. It wants a **always‑on process polling every minute** (`cron.schedule('* * * * *')`), and Hobby cron fires **at most once per day**. It also keeps state in a module‑level array (`transferHistory`), which evaporates between serverless invocations — so even ported to a function, it would return `[]` forever. This feature cannot be honestly delivered on free serverless infra as written.

---

## 6. Security & hygiene

### 🔴 Must address — live credential in a public repo

`signature-verifier/hardhat.config.js:8` commits an **Infura project ID**:
```js
url: "https://sepolia.infura.io/v3/<REDACTED-32-HEX-PROJECT-ID>",
accounts: ["0x1234567890abcdef1234567890abcdef12345678"]
```
- The project ID is a **real credential** (32 hex chars, correct Infura shape) sitting in a public repo since 2024‑11. I could not test whether it is still live — `sepolia.infura.io` is blocked here. **Treat it as live and rotate it.**
- It is present in **8 separate commits** across history, so deleting it from the working tree alone does not remove it from the repo.
- The `accounts` value is *not* a real key — it's 20 bytes, not 32, and visibly a placeholder. No wallet is at risk.

**What this costs if ignored:** Infura keys are scraped from GitHub routinely. The realistic damage is quota theft and rate‑limit exhaustion, not fund loss. Low severity, trivially fixable, but a recruiter who greps your repo will notice.

### 🟡 Other findings
- **`usdc-transfer-tracker/backend/firebaseServiceAccount.json`** — placeholders only, **no live key** (verified). Still: a service‑account file committed to a public repo is exactly the pattern that leaks real keys later. Delete it, ship `.env.example` instead.
- **No `.gitignore` anywhere.** `node_modules/`, `.env`, `artifacts/`, `cache/`, `build/` are all one `git add .` away from being committed. This is the single likeliest future cause of a real leak here.
- **Personal data:** the root README publishes your **phone number** (`tel:+919898318841`) alongside email and socials. Your call entirely — but a phone number on a public repo invites spam, and recruiters don't need it. No third‑party PII anywhere (checked).
- **No auth anywhere**, but also nothing to protect: the Express app exposes one public read‑only `GET /transfers`. `cors()` is wide open — acceptable for this, worth tightening if state is ever added.
- **Dependency age:** `react-scripts@5.0.1` (CRA, unmaintained since 2025) and the deprecated Waffle stack pull a long tail of deprecated transitive packages (`request`, `har-validator`, `glob@7`, `uuid@3`, `testrpc`). I have not run `npm audit` yet — deferring to Phase 2 where fixes belong.
- **Repo is public** — confirmed via API.

---

## 7. Junk to remove

No Replit artifacts (this was never a Replit project). What's actually here:

| Path | Why |
|---|---|
| `merkle-proof-verification/frontend/public/logo.png` | 952 KB, 1024×1024, referenced by nothing. ~50% of the repo's non‑git bytes. |
| `usdc-transfer-tracker/backend/firebaseServiceAccount.json` | Credential‑shaped placeholder file. |
| `merkle-proof-verification/scripts/fetchTransactions.js` | Dead — duplicated inside `generateMerkleTree.js`, imported by nothing. |
| `merkle-proof-verification/frontend/package.json` | Zero‑byte file. |
| `usdc-transfer-tracker/usdc-transfer-tracker/` | Doubled directory name; also contradicts the README's `subgraph/`. |
| Four near‑identical READMEs | ~1,150 lines total, mostly animated GIF banners and a typing‑SVG that still says "Charter‑21BCE0216". Several document APIs that don't exist (`MerkleProofVerifier.verifyProof(leaf, proof, root)` — the real contract is `MerkleVerifier.verify(leaf, proof)`, 2 args, and reads the root from storage). Copy‑paste artifacts throughout: `"author": "Your Name"`, `repository: github.com/your-username/…`, and literal `bash`/`Copy code` lines pasted from a chat UI. |

Nothing to remove for build outputs or IDE files — none are committed (only because no one ever ran a successful build).

---

## 8. Honest verdict

**How far from "live and impressive"?** Further than the READMEs suggest, but the gap is mostly *missing scaffolding*, not *bad thinking*.

What's genuinely good: the `MerkleVerifier` contract is correct, minimal, and backed by 8 real tests that cover the cases people usually skip (empty proof, malformed proof, wrong root, access control). The ECDSA path in `SignatureVerifier` shows real care — the `s`‑malleability guard is something most juniors miss. **Whoever wrote the contracts understood the cryptography.**

What's bad: none of it has ever run end‑to‑end. Two of four projects won't even install. Both frontends are broken — one is missing the three files CRA requires to exist at all. Every "live data" path terminates in a placeholder string. And the documentation confidently describes a system substantially better than the one in the repo, which is the failure mode that costs you the most in an interview — a reviewer who opens `signature-verifier` sees "Universal Compatibility: ECDSA, Schnorr, RSA" in the README and `return false;` in the contract about 20 seconds later.

**Riskiest part:** not the security finding — that's a 10‑minute fix. The real risk is **strategic: there is no product here to deploy.** A recruiter clicking a live link will not be impressed by three disconnected contract demos behind a MetaMask wall they can't get past without a wallet and Sepolia ETH. The single highest‑leverage decision is to stop treating this as "three tasks to repair" and rebuild it as **one coherent, wallet‑optional verification toolkit** where the core path is pure client‑side cryptography that works instantly for a stranger with no credentials — with the on‑chain layer as a *bonus* for visitors who do have a wallet.

That reframing is also what makes the zero‑cost constraint easy instead of painful: Merkle proofs and signature recovery are pure computation. They need no RPC, no database, no API key, no cold‑start‑prone backend, and they cannot break when a free tier expires or a testnet is sunset. The parts that *do* need paid‑ish infra (the subgraph, FCM push) are exactly the parts worth cutting or clearly labelling as simulated.

**My read:** ~85% of the interview value sits in the Merkle + signature work, and ~85% of the remaining effort and fragility sits in the USDC tracker.
