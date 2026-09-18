import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useSwitchChain,
} from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { wagmiConfig } from './config'
import {
  DEPOSIT_CHAIN,
  MIN_DEPOSIT_ETH,
  CREDITS_PER_ETH,
  ethToCredits,
  parseDepositEth,
} from './tokens'
import {
  creditLedgerAddress,
  creditLedgerAbi,
  creditsToMicro,
  microToCredits,
  isCreditLedgerConfigured,
} from './creditLedger'
import { isUserRejection } from './agents'
import { recordPayment } from './paymentLedger'

const CreditLedgerContext = createContext(null)

export function CreditLedgerProvider({ children }) {
  const { address, isConnected, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: DEPOSIT_CHAIN.id })

  const ledger = creditLedgerAddress()
  const configured = isCreditLedgerConfigured()

  const [pending, setPending] = useState(false)
  const [lastError, setLastError] = useState(null)

  const {
    data: microRaw,
    refetch: refetchBalance,
    isFetching,
    isLoading,
  } = useReadContract({
    address: ledger || undefined,
    abi: creditLedgerAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: DEPOSIT_CHAIN.id,
    query: {
      enabled: Boolean(configured && ledger && address),
      refetchInterval: 12_000,
    },
  })

  const balance = useMemo(() => {
    if (!configured) return 0
    if (microRaw == null) return 0
    return +microToCredits(microRaw).toFixed(6)
  }, [configured, microRaw])

  const ensureDepositChain = useCallback(async () => {
    if (chainId !== DEPOSIT_CHAIN.id) {
      await switchChainAsync({ chainId: DEPOSIT_CHAIN.id })
    }
  }, [chainId, switchChainAsync])

  const refreshBalance = useCallback(async () => {
    if (!configured || !address) return 0
    const result = await refetchBalance()
    const micro = result?.data
    return micro == null ? 0 : +microToCredits(micro).toFixed(6)
  }, [configured, address, refetchBalance])

  /** Deposit ETH into CreditLedger → mints on-chain credits for connected wallet. */
  const depositEth = useCallback(
    async (ethAmount) => {
      setLastError(null)
      if (!configured || !ledger) {
        throw new Error('Credit ledger not deployed. Set VITE_CREDIT_LEDGER_ADDRESS.')
      }
      if (!isConnected || !address) {
        throw new Error('Connect wallet first.')
      }
      const num = Number(ethAmount)
      if (!Number.isFinite(num) || num < MIN_DEPOSIT_ETH) {
        throw new Error(`Enter at least ${MIN_DEPOSIT_ETH} ETH.`)
      }

      setPending(true)
      try {
        await ensureDepositChain()
        const value = parseDepositEth(num)
        const hash = await writeContractAsync({
          address: ledger,
          abi: creditLedgerAbi,
          functionName: 'deposit',
          args: [],
          value,
          chainId: DEPOSIT_CHAIN.id,
        })
        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: DEPOSIT_CHAIN.id,
        })
        const next = await refreshBalance()
        recordPayment({
          id: `pay_dep_${hash}`,
          wallet: address,
          kind: 'ledger_deposit',
          eth: num,
          credits: ethToCredits(num),
          txHash: hash,
          createdAt: Date.now(),
          title: 'Studio credit ledger',
        })
        return {
          hash,
          credits: ethToCredits(num),
          balance: next,
        }
      } catch (err) {
        if (isUserRejection(err)) {
          const e = new Error('Cancelled in wallet. Nothing was deposited.')
          setLastError(e.message)
          throw e
        }
        const msg = err?.shortMessage || err?.message || 'Deposit failed.'
        setLastError(msg)
        throw err
      } finally {
        setPending(false)
      }
    },
    [
      configured,
      ledger,
      isConnected,
      address,
      ensureDepositChain,
      writeContractAsync,
      refreshBalance,
    ]
  )

  /**
   * Burn on-chain credits for this wallet (confirm in wallet).
   * Call before model use so unpaid wallets cannot free-ride.
   */
  const spendCredits = useCallback(
    async (credits) => {
      setLastError(null)
      if (!configured || !ledger) {
        throw new Error('Credit ledger not deployed. Set VITE_CREDIT_LEDGER_ADDRESS.')
      }
      if (!isConnected || !address) {
        throw new Error('Connect wallet first.')
      }
      const cost = Number(credits)
      if (!Number.isFinite(cost) || cost <= 0) {
        throw new Error('Invalid credit amount.')
      }
      const micro = creditsToMicro(cost)
      if (micro <= 0n) throw new Error('Credit amount too small.')

      if (balance + 1e-9 < cost) {
        throw new Error(
          `Need ${cost.toFixed(2)} credits (you have ${balance.toFixed(2)}). Deposit ETH first.`
        )
      }

      setPending(true)
      try {
        await ensureDepositChain()
        // Re-read fresh balance to avoid stale UI races
        if (publicClient) {
          const onChain = await publicClient.readContract({
            address: ledger,
            abi: creditLedgerAbi,
            functionName: 'balanceOf',
            args: [address],
          })
          if (onChain < micro) {
            throw new Error(
              `Need ${cost.toFixed(2)} credits on-chain. Deposit ETH to the credit ledger.`
            )
          }
        }

        const hash = await writeContractAsync({
          address: ledger,
          abi: creditLedgerAbi,
          functionName: 'spend',
          args: [micro],
          chainId: DEPOSIT_CHAIN.id,
        })
        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: DEPOSIT_CHAIN.id,
        })
        const next = await refreshBalance()
        recordPayment({
          id: `pay_sp_${hash}`,
          wallet: address,
          kind: 'ledger_spend',
          eth: cost / CREDITS_PER_ETH,
          credits: cost,
          txHash: hash,
          createdAt: Date.now(),
          title: 'Studio model spend',
        })
        return { hash, credits: cost, balance: next }
      } catch (err) {
        if (isUserRejection(err)) {
          const e = new Error('Cancelled in wallet. Credits not spent.')
          setLastError(e.message)
          throw e
        }
        const msg = err?.shortMessage || err?.message || 'Spend failed.'
        setLastError(msg)
        throw err
      } finally {
        setPending(false)
      }
    },
    [
      configured,
      ledger,
      isConnected,
      address,
      balance,
      ensureDepositChain,
      publicClient,
      writeContractAsync,
      refreshBalance,
    ]
  )

  useEffect(() => {
    if (!address) return
    refreshBalance()
  }, [address, refreshBalance])

  const value = {
    configured,
    ledgerAddress: ledger,
    balance,
    pending: pending || isFetching || isLoading,
    isSyncing: isFetching || isLoading,
    lastError,
    depositEth,
    spendCredits,
    refreshBalance,
    chain: DEPOSIT_CHAIN,
  }

  return (
    <CreditLedgerContext.Provider value={value}>{children}</CreditLedgerContext.Provider>
  )
}

export function useCreditLedger() {
  const ctx = useContext(CreditLedgerContext)
  if (!ctx) {
    throw new Error('useCreditLedger must be used within CreditLedgerProvider')
  }
  return ctx
}
