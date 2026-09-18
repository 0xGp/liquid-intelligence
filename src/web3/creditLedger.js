import { getAddress, isAddress } from 'viem'
import { DEPOSIT_CHAIN } from './tokens'
import { creditLedgerAbi, creditsToMicro, microToCredits } from './creditLedgerAbi'

export { creditLedgerAbi, creditsToMicro, microToCredits }

export function creditLedgerAddress() {
  const raw = (import.meta.env.VITE_CREDIT_LEDGER_ADDRESS || '').trim()
  if (!raw || !isAddress(raw)) return null
  return getAddress(raw)
}

export function isCreditLedgerConfigured() {
  return Boolean(creditLedgerAddress())
}

export function creditLedgerContract() {
  const address = creditLedgerAddress()
  if (!address) return null
  return {
    address,
    abi: creditLedgerAbi,
    chainId: DEPOSIT_CHAIN.id,
  }
}
