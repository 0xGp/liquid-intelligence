import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { creditsToMicro, microToCredits } from '../web3/creditLedgerAbi'
import { recordPayment } from '../web3/paymentLedger'
import { useNearWallet } from './NearWalletContext'
import {
  CREDITS_PER_NEAR,
  MIN_ATTACHED_NEAR,
  NEAR_CONTRACT_ID,
  nearToYocto,
  viewFunction,
} from './rpc'

const NearLedgerContext = createContext(null)

function isRejection(err) {
  const message = `${err?.message || ''} ${err?.name || ''}`
  return /reject|cancel|closed|dismiss/i.test(message)
}

export function NearLedgerProvider({ children }) {
  const { accountId, isConnected, signAndSend } = useNearWallet()
  const [balance, setBalance] = useState(0)
  const [pending, setPending] = useState(false)
  const [lastError, setLastError] = useState(null)
  const configured = Boolean(NEAR_CONTRACT_ID)

  const refreshBalance = useCallback(async () => {
    if (!configured || !accountId) {
      setBalance(0)
      return 0
    }
    const micro = await viewFunction('balance_of', { account: accountId })
    const next = +microToCredits(BigInt(micro)).toFixed(6)
    setBalance(next)
    return next
  }, [accountId, configured])

  useEffect(() => {
    refreshBalance().catch(() => setBalance(0))
    if (!accountId || !configured) return undefined
    const id = window.setInterval(() => {
      refreshBalance().catch(() => {})
    }, 12_000)
    return () => window.clearInterval(id)
  }, [accountId, configured, refreshBalance])

  const depositEth = useCallback(
    async (amount) => {
      setLastError(null)
      if (!configured) throw new Error('Set VITE_NEAR_CONTRACT_ID.')
      if (!isConnected || !accountId) throw new Error('Connect a NEAR wallet first.')
      const num = Number(amount)
      if (!Number.isFinite(num) || num < MIN_ATTACHED_NEAR) {
        throw new Error(`Enter at least ${MIN_ATTACHED_NEAR} NEAR.`)
      }
      setPending(true)
      try {
        const beforeMicro = BigInt(await viewFunction('balance_of', { account: accountId }))
        const hash = await signAndSend({
          methodName: 'deposit',
          args: {},
          deposit: nearToYocto(num).toString(),
        })
        const afterMicro = BigInt(await viewFunction('balance_of', { account: accountId }))
        const next = await refreshBalance()
        const credits = +microToCredits(afterMicro - beforeMicro).toFixed(6)
        recordPayment({
          id: `pay_dep_${hash || Date.now()}`,
          wallet: accountId,
          kind: 'ledger_deposit',
          eth: num,
          credits,
          txHash: hash,
          createdAt: Date.now(),
          title: 'Studio credit ledger',
        })
        return { hash, credits, balance: next }
      } catch (err) {
        if (isRejection(err)) {
          const cancelled = new Error('Cancelled in wallet. Nothing was deposited.')
          setLastError(cancelled.message)
          throw cancelled
        }
        const message = err?.message || 'Deposit failed.'
        setLastError(message)
        throw err
      } finally {
        setPending(false)
      }
    },
    [accountId, configured, isConnected, refreshBalance, signAndSend],
  )

  const redeemCredits = useCallback(async () => {
    setLastError(null)
    if (!configured) throw new Error('Set VITE_NEAR_CONTRACT_ID.')
    if (!isConnected || !accountId) throw new Error('Connect a NEAR wallet first.')
    setPending(true)
    try {
      const micro = BigInt(await viewFunction('balance_of', { account: accountId }))
      if (micro <= 0n) throw new Error('No credits to return.')
      const hash = await signAndSend({
        methodName: 'redeem',
        args: {},
        deposit: '0',
      })
      const next = await refreshBalance()
      const credits = +microToCredits(micro).toFixed(6)
      recordPayment({
        id: `pay_rdm_${hash || Date.now()}`,
        wallet: accountId,
        kind: 'ledger_redeem',
        eth: credits / CREDITS_PER_NEAR,
        credits,
        txHash: hash,
        createdAt: Date.now(),
        title: 'Studio credit return',
      })
      return { hash, credits, balance: next }
    } catch (err) {
      if (isRejection(err)) {
        const cancelled = new Error('Cancelled in wallet. Credits were not returned.')
        setLastError(cancelled.message)
        throw cancelled
      }
      const message = err?.message || 'Return failed.'
      setLastError(message)
      throw err
    } finally {
      setPending(false)
    }
  }, [accountId, configured, isConnected, refreshBalance, signAndSend])

  const spendCredits = useCallback(
    async (credits) => {
      setLastError(null)
      if (!configured) throw new Error('Set VITE_NEAR_CONTRACT_ID.')
      if (!isConnected || !accountId) throw new Error('Connect a NEAR wallet first.')
      const cost = Number(credits)
      if (!Number.isFinite(cost) || cost <= 0) throw new Error('Invalid credit amount.')
      const micro = creditsToMicro(cost)
      if (micro <= 0n) throw new Error('Credit amount too small.')
      if (balance + 1e-9 < cost) {
        throw new Error(
          `Need ${cost.toFixed(2)} credits (you have ${balance.toFixed(2)}). Deposit NEAR first.`,
        )
      }
      setPending(true)
      try {
        const onChain = BigInt(await viewFunction('balance_of', { account: accountId }))
        if (onChain < micro) {
          throw new Error(`Need ${cost.toFixed(2)} credits on-chain. Deposit NEAR to the credit ledger.`)
        }
        const hash = await signAndSend({
          methodName: 'spend',
          args: { micro_cost: micro.toString() },
          deposit: '0',
        })
        const next = await refreshBalance()
        recordPayment({
          id: `pay_sp_${hash || Date.now()}`,
          wallet: accountId,
          kind: 'ledger_spend',
          eth: cost / CREDITS_PER_NEAR,
          credits: cost,
          txHash: hash,
          createdAt: Date.now(),
          title: 'Studio model spend',
        })
        return { hash, credits: cost, balance: next }
      } catch (err) {
        if (isRejection(err)) {
          const cancelled = new Error('Cancelled in wallet. Credits not spent.')
          setLastError(cancelled.message)
          throw cancelled
        }
        const message = err?.message || 'Spend failed.'
        setLastError(message)
        throw err
      } finally {
        setPending(false)
      }
    },
    [accountId, balance, configured, isConnected, refreshBalance, signAndSend],
  )

  const value = useMemo(
    () => ({
      configured,
      ledgerAddress: NEAR_CONTRACT_ID || null,
      balance,
      pending,
      isSyncing: pending,
      lastError,
      depositEth,
      redeemCredits,
      spendCredits,
      refreshBalance,
    }),
    [balance, configured, depositEth, lastError, pending, redeemCredits, refreshBalance, spendCredits],
  )

  return <NearLedgerContext.Provider value={value}>{children}</NearLedgerContext.Provider>
}

export function useNearLedger() {
  const ctx = useContext(NearLedgerContext)
  if (!ctx) throw new Error('useNearLedger must be used within NearLedgerProvider')
  return ctx
}
