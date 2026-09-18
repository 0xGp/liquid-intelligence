import { getAddress, isAddress, parseEther } from 'viem'
import { robinhood, robinhoodTestnet } from './chain'

/** Deposit settlement network — testnet until mainnet launch. */
export const DEPOSIT_CHAIN =
  import.meta.env.VITE_DEPOSIT_NETWORK === 'mainnet' ? robinhood : robinhoodTestnet

/** Minimum native ETH deposit on Robinhood (testnet-friendly). */
export const MIN_DEPOSIT_ETH = 0.001

/**
 * Credits minted per 1 ETH deposited.
 * 0.001 ETH → 5 credits (same floor as the old 5 USDC min).
 */
export const CREDITS_PER_ETH = 5000

const envAddr = (key, fallback) =>
  import.meta.env[key] && isAddress(import.meta.env[key])
    ? getAddress(import.meta.env[key])
    : fallback
      ? getAddress(fallback)
      : null

/** Where deposits settle. Prefer VITE_VINCE_TREASURY; otherwise payer (demo hold). */
export function depositDestination(payer) {
  const treasury = envAddr('VITE_VINCE_TREASURY')
  if (treasury) return treasury
  if (payer && isAddress(payer)) return getAddress(payer)
  return null
}

export function ethToCredits(ethAmount) {
  return +(Number(ethAmount) * CREDITS_PER_ETH).toFixed(2)
}

export function parseDepositEth(amount) {
  return parseEther(String(amount))
}

/** Native ETH is the only deposit asset. */
export function depositAsset() {
  return {
    id: 'eth',
    symbol: 'ETH',
    decimals: 18,
    chainId: DEPOSIT_CHAIN.id,
    native: true,
  }
}
