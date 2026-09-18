# CreditLedger (Robinhood Testnet)

On-chain platform credits for marketplace video + text models.

## Flow

1. User connects wallet on **Robinhood Testnet** (chain id `46630`).
2. User calls `deposit()` with ≥ `0.001` ETH → micro-credits mint to that address.
3. Balance is read from `balanceOf(wallet)` — **source of truth** (not localStorage).
4. Before Generate / Send chat, user confirms `spend(microCost)` → credits burn.
5. Owner can `withdraw` escrowed ETH to the treasury address.

## Deploy

Fund a deployer wallet with Robinhood Testnet ETH, then:

```bash
# uses DEPLOYER_PRIVATE_KEY or VAULT_PRIVATE_KEY from .env
node scripts/deploy-credit-ledger.mjs
```

Optional:

```bash
TREASURY_ADDRESS=0xYourTreasury node scripts/deploy-credit-ledger.mjs
```

Copy the printed address into `.env`:

```bash
VITE_CREDIT_LEDGER_ADDRESS=0x...
VITE_DEPOSIT_NETWORK=testnet
VITE_VINCE_TREASURY=0x...   # withdraw destination (defaults to deployer if unset at deploy)
```

Restart `npm run dev` after editing `.env`.

## Verify

- Deposit modal → confirm `deposit` tx → top bar shows on-chain credits.
- Generate / chat → wallet prompts `spend` → balance decreases on-chain.
- Explorer: https://explorer.testnet.chain.robinhood.com
