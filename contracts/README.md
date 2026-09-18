# ApiKeyMarketplace (Robinhood Testnet)

Stores **sealed API-key ciphertext** on-chain. Plaintext keys never appear in transactions or storage.

## Flow

1. Lister encrypts key with `VITE_VAULT_PUBLIC_KEY` (browser).
2. `createListing(..., ciphertext)` writes bytes on Robinhood testnet.
3. Renter `deposit(listingId)` with ETH → micro-credits.
4. On Use, Vince vault (`VAULT_PRIVATE_KEY`) reads `getCiphertext`, decrypts, calls provider — **key never returned to client**.
5. Operator `meterUsage` (production) or app ledger meters fees; lister `claim`.

## Deploy (script)

```bash
# uses DEPLOYER_PRIVATE_KEY or VAULT_PRIVATE_KEY
npm run deploy:market
```

Then set:

```bash
VITE_API_KEY_MARKET_ADDRESS=0x...
```

## Deploy (Remix)

1. Open [Remix](https://remix.ethereum.org) → paste `ApiKeyMarketplace.sol`.
2. Compile 0.8.20+.
3. Inject Robinhood Testnet (chain id **46630**, RPC `https://rpc.testnet.chain.robinhood.com`).
4. Deploy with:
   - `treasury_` = your treasury address
   - `operator_` = hot wallet that will call `meterUsage` (or same as deployer)
   - `platformFeeBps_` = `1000` (10%)
5. Copy address → `.env`:

```bash
VITE_API_KEY_MARKET_ADDRESS=0x...
```

## Vault keys

```bash
node scripts/generate-vault-keys.mjs
# merge vault-keys.env.snippet into .env
# VITE_VAULT_PUBLIC_KEY=...   (client)
# VAULT_PRIVATE_KEY=...       (server only — no VITE_ prefix)
```

Restart `npm run dev` after editing `.env`.
