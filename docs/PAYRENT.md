# Payrent — Dapp Overview

Payrent is a React + Vite dapp on **Robinhood Chain (testnet by default)** for:

1. **Platform AI marketplace** — deposit ETH → on-chain credits → generate video / chat with Vince-hosted keys  
2. **API key rental market** — list sealed keys on-chain, rent with ETH, use chat/video via vault decrypt (key never leaves the server)

**Stack:** React 19, Vite, wagmi / RainbowKit / viem, Solidity contracts, Vite vault middleware.

**Network:** Robinhood Testnet · chain id `46630` · RPC `https://rpc.testnet.chain.robinhood.com`

---

## Core functionality

### 1. Wallet connect
- Robinhood Wallet (preferred), plus WalletConnect / MetaMask / Rainbow via RainbowKit.
- Connecting on the landing hero typically routes to `#marketplace`.
- Persistent **TopWalletBar** (when connected): address, network pill, on-chain credit balance, Deposit / Disconnect.

### 2. Platform credit ledger (pay-to-use Vince models)
- Contract: `CreditLedger` (`VITE_CREDIT_LEDGER_ADDRESS`).
- User calls `deposit()` with native ETH (min **0.001 ETH**).
- Rate: **5,000 credits / ETH** (e.g. 0.001 ETH → 5 credits).
- Balance is read on-chain via `balanceOf(wallet)` — not localStorage.
- Before video generate / chat send (platform path), user confirms `spend(microCredits)`.
- Owner can withdraw escrowed ETH to treasury.

### 3. Video marketplace studio
- Tab **Video** on `#marketplace`.
- Model cards (Opper video, Kling, Sora, Omni, etc.).
- Side drawer (`ConfigPanel`): prompt, duration, resolution, generate.
- Live paths: Opper Videos API, Kling generate+poll, OpenAI Sora, Gemini Omni (env keys).
- Gated by on-chain credits unless a **rented key session** is active.
- Result modal plays video from provider URL / `resultUrls`.

### 4. Text LLM chat studio
- Tab **Text LLMs** on `#marketplace`.
- Drawer (`TextChatPanel`): multi-turn Opper Conversations (`/v3/compat/chat/completions`).
- Full message history each turn (system + user + assistant).
- Models: GPT-5 mini, GPT-4o mini, GPT-4o, Gemini Flash (via Opper model ids).
- Platform path: ledger `spend` then Opper with `VITE_OPPER_API_KEY`.
- Rented path: vault proxy with listing key; meters **rental** credits.

### 5. API key marketplace (list / rent / use)
- Contract: `ApiKeyMarketplace` (`VITE_API_KEY_MARKET_ADDRESS`).
- **List** (`#list-key`): browser seals API key with RSA vault public key → `createListing` stores **ciphertext only**.
- **Browse / rent** (`#api-market`): deposit ETH → credits on that listing.
- **Decrypt · open chat / video**: vault smoke-decrypts, opens studio session; raw key never returned to browser.
- **Use**: requests go through `POST /api/vault/proxy` (server decrypt + forward to Opper / OpenAI / Kling / Gemini).
- Platform fee on rental usage: **10%** (`platformFeeBps = 1000`); lister claims remaining.

### 6. Vault crypto
- Client: `VITE_VAULT_PUBLIC_KEY` = RSA-OAEP SPKI (base64) — **not** a wallet address.
- Server: `VAULT_PRIVATE_KEY` = PKCS8 (base64) — decrypt only in Vite plugin.
- Generate: `node scripts/generate-vault-keys.mjs`
- Endpoints: `/api/vault/health`, `/api/vault/decrypt-use`, `/api/vault/proxy`

### 7. Earnings & payments
- **Earnings** (`#earnings`): your listings, claimable ETH, usage stats, claim to wallet.
- **Payments** (`#payments`): wallet payment ledger — deposits, spends, key rents, usage, claims; filters + analytics.

---

## Pages & routes (hash router)

| Hash | Page | Purpose |
|------|------|---------|
| `#` / default | `LandingPage` | Marketing home |
| `#marketplace` | `MarketplacePage` | Video + Text studio |
| `#api-market` | `ApiMarketPage` | Browse / rent sealed keys |
| `#list-key` | `ListKeyPage` | Publish a sealed API key |
| `#earnings` | `EarningsPage` | Lister earnings & claim |
| `#payments` | `PaymentsPage` | Wallet payment history & analytics |
| `#rail` | `Rail` | Legacy / experimental rail UI |
| `#about` | Landing section | How it works (scroll target) |

Nav labels (from `src/data.js`): Marketplace · API keys · List key · Payments · How it works.

### Landing (`LandingPage`)
Sections in order:
1. **Hero** — brand, CTA to marketplace / connect  
2. **UseCases**  
3. **Manifesto**  
4. **About** (`#about`)  
5. **KeyRentSection** — pitch for listing/renting keys  
6. **Services**  
7. **Stats**  
8. **Marquee**  
9. **FinalCta**  
10. **Footer**

### Marketplace (`#marketplace`)
- Back `←` (top)
- Optional **Rented key active** banner (title, mask, rental credits, Clear)
- Header: title, Video | Text LLMs tabs, wallet pills, Deposit ETH
- Grid of models + footer
- Drawer: `ConfigPanel` (video) or `TextChatPanel` (text)
- `VideoResultModal` for completed video jobs

### API key market (`#api-market`)
- Filters: All / Text / Video / Image  
- Rent amount input (ETH)  
- Cards: title, provider, price/call, deposit, **Decrypt · open chat|video**  
- Status strip for tx / errors  

### List key (`#list-key`)
- Form: provider, capability, title, description, price (credits), API key  
- Shows vault RSA readiness + market contract short id  
- On submit: seal → on-chain `createListing` (or local sealed fallback if market unset)  

### Earnings (`#earnings`)
- Claimable total, per-listing rows, claim button, usage table  

### Payments (`#payments`)
- Paid / deposited / credits spent / claimed·claimable  
- Filters: All · Paid · Earned · Deposits · Spends  
- Sync on-chain + local activity  

---

## Global UI chrome

| Component | Role |
|-----------|------|
| `Nav` | Logo VINCE, links, wallet button, mobile burger |
| `TopWalletBar` | Connected session + credits + deposit |
| `DepositModal` | CreditLedger `deposit()` on Robinhood Testnet |
| `Cursor` | Custom cursor (hidden on mobile / rail mode) |

---

## User flows

### A — Use Vince models (platform credits)
```
Connect wallet → Deposit ETH to CreditLedger → #marketplace
→ pick Video or Text → Generate / Send
→ confirm spend tx → API call with env keys → result
```

### B — List a key
```
#list-key → paste key → seal to vault pubkey → wallet createListing
→ appears on #api-market (ciphertext on-chain)
```

### C — Rent & use someone’s key
```
#api-market → Deposit ETH on listing → Decrypt · open chat|video
→ vault unlocks session → studio opens
→ each message/job via /api/vault/proxy → rental credits metered
```

### D — Lister cash out
```
#earnings → claim → ETH from marketplace escrow (net of 10% fee)
```

---

## On-chain contracts (Robinhood mainnet)

| Contract | Env | Address (deployed) |
|----------|-----|--------------------|
| CreditLedger | `VITE_CREDIT_LEDGER_ADDRESS` | `0x876aa2eDDcF3CEbA676Cb30C2D6616fb8EbD62Ad` |
| ApiKeyMarketplace | `VITE_API_KEY_MARKET_ADDRESS` | `0xa97345F24818638D5EFe798925f260505541a9B0` |

Treasury / deployer: `0x9D2D3B1d1062a33B39E7b8E5ef38BdD63e995153`

Deploy scripts (`DEPLOY_NETWORK=mainnet` or `VITE_DEPOSIT_NETWORK=mainnet`):
- `npm run deploy:ledger`
- `npm run deploy:market`

Docs: `contracts/CREDIT_LEDGER.md`, `contracts/README.md`

---

## Env vars (high level)

| Variable | Role |
|----------|------|
| `VITE_OPPER_API_KEY` / Kling / OpenAI / Gemini | Platform studio upstream keys |
| `VITE_CREDIT_LEDGER_ADDRESS` | Platform credits |
| `VITE_API_KEY_MARKET_ADDRESS` | Key listings |
| `VITE_VAULT_PUBLIC_KEY` | RSA seal (client) |
| `VAULT_PRIVATE_KEY` | RSA open (server only) |
| `VITE_VINCE_TREASURY` | Withdraw destination |
| `VITE_DEPOSIT_NETWORK` | `testnet` \| `mainnet` |
| `DEPLOYER_PRIVATE_KEY` | Deploy scripts (ETH key; keep separate from RSA vault) |

Never commit `.env` or `vault-keys.env.snippet`.

---

## Mobile view

Breakpoints used in CSS: **~860px**, **720px**, **768px**, **520px**, **960px**.

### Navigation
- Below ~860px: horizontal nav collapses to **burger menu**; full-screen / overlay links.
- Custom cursor disabled on mobile.

### Landing
- Hero / about / stats / footer stack to single column.
- Stats become 2-column grid.
- Key-rent section: two-column → one column.

### Marketplace
- Page padding tightens (`96px 20px` region).
- Top bar wraps: back alone on top; title + session stack.
- At **720px**: session row full width; Deposit button flexes.
- Prompt drawer is full-viewport sheet (body scroll locked while open).

### API market / List / Earnings / Payments
- Shared `.ak-page` padding works on narrow screens.
- Split layouts (list form + tips, earn hero) collapse to **1 column** ≤860px.
- Payments statement grid: **4 → 2** columns ≤860px; tighter at **520px**.
- Listing cards stack; action buttons wrap.

### Wallet / deposit
- Top wallet bar stacks vertically on small screens.
- Deposit modal: single-column address + amount presets remain tappable.

### Touch / UX notes
- Primary CTAs use large tap targets (deposit, generate, send).
- Wallet confirms (`deposit` / `spend` / `createListing`) still require mobile wallet app approval.
- Video preview uses native HTML5 video (works in mobile Safari/Chrome).

---

## File map (orientation)

```
src/pages/           Landing, Marketplace, ApiMarket, ListKey, Earnings, Payments
src/components/      Hero, ConfigPanel, TextChatPanel, DepositModal, TopWalletBar, …
src/context/         MarketplaceContext (studio UI state)
src/web3/            CreditLedger, ApiKeyMarket, vault crypto/proxy, tokens, chain
server/              vaultPlugin + vaultDecrypt (Vite middleware)
contracts/           CreditLedger.sol, ApiKeyMarketplace.sol
scripts/             deploy-*.mjs, generate-vault-keys.mjs
```

---

## Local run

```bash
npm install
# fill .env from .env.example (ledger + market + RSA vault + Opper/Kling as needed)
npm run dev
```

Open the Vite URL → connect Robinhood Testnet wallet → Deposit → Marketplace or API keys.

---

## Security model (short)

| Asset | Where it lives |
|-------|----------------|
| Platform AI keys | Server/env (`VITE_*` for browser-proxied calls) |
| Listed renter keys | On-chain **ciphertext** only |
| Decrypt | Server vault private key only |
| Platform payment proof | CreditLedger balances |
| Rental payment proof | ApiKeyMarketplace deposits + metered usage |

Raw listed API keys are **never** written to the chain or returned to the browser after decrypt.
