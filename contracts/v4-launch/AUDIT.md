# LatentX launch contracts — internal security review

Scope: `src/TaxHook.sol` (token and hook in one contract), `src/Launcher.sol`, `src/LaunchMath.sol`,
`script/Deploy.s.sol`.
Target chain: Robinhood Chain mainnet (4663); Ethereum mainnet is also supported.
Method: line-by-line review, proof-of-concept exploits on forks of Ethereum and Robinhood Chain, regression tests.
This is an internal review, not a professional third-party audit.

## Summary

| ID | Severity | Location | Finding | Status |
|----|----------|----------|---------|--------|
| M-01 | Medium | `TaxHook.sol` permissions | Anyone could add their own liquidity and trade through the pool as a range order, paying no tax | Fixed |
| L-01 | Low | `TaxHook.sol` `transferOwnership` | Ownership moved in one step, so a typo could lose the owner role | Fixed |
| I-01 | Info | `TaxHook.sol` `_beforeSwap` | Tax on exact-ETH routes is charged on the requested amount even if a custom price limit stops the swap early | Acknowledged |
| I-02 | Info | `TaxHook.sol` tax math | Swaps under ~34 wei round to zero tax | Acknowledged |
| I-03 | Info | Launch | Bots can buy right after the launch transaction (back-run), but not before it | Mitigate operationally |
| I-04 | Info | `Deploy.s.sol`, `Launcher.sol` | Deploy and launch happen in one transaction; the address is tied to the deployer's nonce | Resolved by design |
| I-05 | Info | Owner role | The owner can lower taxes and change the treasury | Use a multisig |
| I-06 | Info | `sweepTaxes` | If ownership is renounced while the treasury rejects ETH, taxes are stuck | Check before renouncing |
| I-07 | Info | Design | The tax only applies to this pool; holders can create other pools and trade untaxed there | Inherent |
| I-08 | Info | `launch` | The dev buy is untaxed | By design |
| I-09 | Info | Design | No upgrades and no way to remove liquidity | By design |

## M-01 — Taxless trading through range orders (fixed)

The tax is charged when someone swaps. In Uniswap v4, providing liquidity in a narrow price band
also acts like a limit order: when the price crosses the band, the liquidity converts from one
asset to the other. Because the hook only taxed swaps, a holder could:

1. Add token-only liquidity just below the current price.
2. Wait for buyers to push the price through that band, which converts the tokens into ETH.
3. Remove the liquidity and leave with ETH, never having swapped.

The proof of concept on a mainnet fork: Alice exited with 0.754 ETH, paid 0 tax, and should have
paid 0.0226 ETH. Doing the same thing with ETH-only liquidity above the price is a taxless buy.

Fix: the hook now uses `beforeAddLiquidity` and rejects every outside liquidity add
(`LiquidityLocked`). The hook's own launch is not affected, because the PoolManager does not call
hooks for their own actions. The pool's LP fee is 0%, so outside LPs had no legitimate reason to
be there. Tests: `test_M01_*` in `test/Audit.t.sol`.

## L-01 — Single-step ownership (fixed)

`transferOwnership` used to hand over control immediately, and `address(0)` meant renounce.
Now `transferOwnership` only nominates a `pendingOwner`, who must call `acceptOwnership`.
Renouncing is a separate `renounceOwnership` call. Tests: `test_L01_*`.

## Informational notes

- **I-01:** Routes where the trader fixes the ETH amount (buy with exact ETH in, sell for exact
  ETH out) take the tax before the swap runs. If the trader sets a custom price limit that stops
  the swap partway, they still pay tax on the full requested amount. Wallets and the Uniswap app
  don't set such limits; at most 3% of the unfilled part is over-charged.
- **I-02:** Integer rounding means a swap of under ~34 wei pays no tax. Gas costs far more than
  this, so it is not exploitable.
- **I-03:** Pool creation, liquidity and the dev buy happen in one transaction, so nobody can buy
  before the dev. Bots can still buy in the very next transaction. Robinhood Chain (an Arbitrum
  Orbit chain) orders transactions first-come-first-served through its sequencer with no public
  mempool, so nobody can see the launch before it lands. On Ethereum, send it through a private
  RPC such as Flashbots Protect.
- **I-04:** The token and the hook are one contract, and the deploy is a single transaction: a
  throwaway `Launcher` contract deploys it with CREATE2 and calls `launch` in its constructor.
  The CREATE2 address depends on the Launcher's address, which only the deployer's next nonce can
  produce, so nobody can front-run the deployment. If the deployer sends any other transaction
  first, the predicted address changes; the script recomputes it each run.
- **I-05:** The owner cannot raise taxes, remove liquidity or block trading. It can lower taxes
  and point the treasury at another address, so a stolen owner key would redirect future taxes.
  Use a Safe multisig as owner.
- **I-06:** `sweepTaxes` can only be called by the owner or the treasury, and always sends ETH to
  the treasury. The treasury keeps this right after ownership is renounced. If the treasury rejects ETH, the sweep fails
  (trading is unaffected) and the owner can set a new treasury. After renouncing, nobody can, so
  test a sweep before renouncing.
- **I-07:** Every tax token has this limit: once people hold tokens they can open a pool
  elsewhere (Uniswap v2/v3, or v4 without this hook) and trade there without tax.
- **I-08:** The hook's own dev buy skips its own tax. It is visible on-chain in the launch
  transaction.
- **I-09:** Nothing can be upgraded and the launch liquidity can never be withdrawn. If a bug is
  found, the only lever is lowering taxes (down to 0).

## Checked and found safe

- Tax math for all four swap routes, including fuzzing, matches 3% of the ETH side.
- Nobody but the hook can create the pool, including before launch.
- A treasury that rejects ETH cannot block trading.
- Taxes can only go down and are capped at 3% at deploy.
- Launch liquidity stays in place after heavy trading.
- The token has a fixed supply, no owner, no mint, and no transfer restrictions.
- The deploy script rejects a stale or non-positive Chainlink ETH/USD price.
- Trading works through the real Universal Router used by wallets and the Uniswap app.

Test suite: 27 tests, all passing on a Robinhood Chain mainnet fork (`forge test`).

## Second review

An independent automated review of the pre-fix code found no medium or higher issues and agreed
with the trust notes above (dev buy, owner powers, other pools). It did not catch M-01; the
proof of concept above shows that issue was real.
