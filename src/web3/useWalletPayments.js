import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { DEPOSIT_CHAIN, CREDITS_PER_ETH } from './tokens'
import { creditLedgerAddress, creditLedgerAbi, microToCredits } from './creditLedger'
import { apiKeyMarketplaceAbi, marketplaceAddress } from './apiKeyMarketplaceAbi'
import { creditsToEth } from './apiKeyMarket'
import { loadPayments, mergePaymentLists, onPaymentsChange, PAYMENT_KINDS } from './paymentLedger'
import { useApiKeyMarket } from './ApiKeyMarketContext'

function asEth(wei) {
  try {
    return Number(formatEther(wei))
  } catch {
    return 0
  }
}

function dayKey(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return d.toISOString().slice(0, 10)
}

export function useWalletPayments() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: DEPOSIT_CHAIN.id })
  const { listings, rentals, usage, claims, myClaimable } = useApiKeyMarket()
  const [localTick, setLocalTick] = useState(0)
  const [chainRows, setChainRows] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  useEffect(() => onPaymentsChange(() => setLocalTick((n) => n + 1)), [])

  const localRows = useMemo(() => loadPayments(address), [address, localTick])

  const marketRows = useMemo(() => {
    if (!address) return []
    const lc = address.toLowerCase()
    const listingTitle = (id) =>
      listings.find((l) => l.id === String(id) || l.onChainId === String(id))?.title ||
      `Listing ${id}`

    const fromRentals = rentals
      .filter((r) => r.renter?.toLowerCase() === lc && Number(r.ethDeposited) > 0)
      .map((r) => ({
        id: `rental_${r.id}`,
        wallet: r.renter,
        kind: 'key_rent',
        eth: Number(r.ethDeposited) || 0,
        credits: Number(r.creditsTotal) || 0,
        txHash: r.txHash || null,
        createdAt: r.createdAt || Date.now(),
        title: listingTitle(r.listingId),
        listingId: r.listingId,
      }))

    const fromUsage = usage
      .filter((u) => u.renter?.toLowerCase() === lc)
      .map((u) => ({
        id: u.id,
        wallet: u.renter,
        kind: 'key_usage',
        eth: Number(u.ethBurned) || 0,
        credits: Number(u.credits) || 0,
        txHash: u.txHash || null,
        createdAt: u.createdAt || Date.now(),
        title: listingTitle(u.listingId),
        listingId: u.listingId,
      }))

    const fromClaims = claims
      .filter((c) => c.owner?.toLowerCase() === lc)
      .map((c) => ({
        id: c.id,
        wallet: c.owner,
        kind: 'claim',
        eth: Number(c.ethAmount) || 0,
        credits: 0,
        txHash: c.txHash || null,
        createdAt: c.createdAt || Date.now(),
        title: listingTitle(c.listingId),
        listingId: c.listingId,
      }))

    return [...fromRentals, ...fromUsage, ...fromClaims]
  }, [address, listings, rentals, usage, claims])

  const refreshChain = useCallback(async () => {
    if (!address || !publicClient) {
      setChainRows([])
      return
    }
    setSyncing(true)
    setSyncError(null)
    try {
      const latest = await publicClient.getBlockNumber()
      const fromBlock = latest > 250_000n ? latest - 250_000n : 0n
      const rows = []
      const ledger = creditLedgerAddress()
      const market = marketplaceAddress()

      const pull = async (fn) => {
        try {
          return await fn()
        } catch {
          return []
        }
      }

      if (ledger) {
        const deposited = await pull(() =>
          publicClient.getContractEvents({
            address: ledger,
            abi: creditLedgerAbi,
            eventName: 'Deposited',
            args: { payer: address },
            fromBlock,
            toBlock: latest,
            strict: true,
          })
        )
        for (const log of deposited) {
          const eth = asEth(log.args.ethIn)
          rows.push({
            id: `chain_dep_${log.transactionHash}`,
            wallet: address,
            kind: 'ledger_deposit',
            eth,
            credits: microToCredits(log.args.microCreditsAdded || 0n),
            txHash: log.transactionHash,
            createdAt: Number(log.blockNumber) * 1000,
            blockNumber: Number(log.blockNumber),
            title: 'Studio credit ledger',
          })
        }
        const spent = await pull(() =>
          publicClient.getContractEvents({
            address: ledger,
            abi: creditLedgerAbi,
            eventName: 'Spent',
            args: { payer: address },
            fromBlock,
            toBlock: latest,
            strict: true,
          })
        )
        for (const log of spent) {
          const credits = microToCredits(log.args.microCreditsBurned || 0n)
          rows.push({
            id: `chain_sp_${log.transactionHash}`,
            wallet: address,
            kind: 'ledger_spend',
            eth: credits / CREDITS_PER_ETH,
            credits,
            txHash: log.transactionHash,
            createdAt: Number(log.blockNumber) * 1000,
            blockNumber: Number(log.blockNumber),
            title: 'Studio model spend',
          })
        }
      }

      if (market) {
        const rents = await pull(() =>
          publicClient.getContractEvents({
            address: market,
            abi: apiKeyMarketplaceAbi,
            eventName: 'Deposited',
            args: { renter: address },
            fromBlock,
            toBlock: latest,
            strict: true,
          })
        )
        for (const log of rents) {
          const eth = asEth(log.args.ethIn)
          rows.push({
            id: `chain_rent_${log.transactionHash}`,
            wallet: address,
            kind: 'key_rent',
            eth,
            credits: microToCredits(log.args.microCreditsAdded || 0n),
            txHash: log.transactionHash,
            createdAt: Number(log.blockNumber) * 1000,
            blockNumber: Number(log.blockNumber),
            title: `Key listing ${log.args.listingId}`,
            listingId: String(log.args.listingId),
          })
        }
        const meters = await pull(() =>
          publicClient.getContractEvents({
            address: market,
            abi: apiKeyMarketplaceAbi,
            eventName: 'UsageMetered',
            args: { renter: address },
            fromBlock,
            toBlock: latest,
            strict: true,
          })
        )
        for (const log of meters) {
          const credits = microToCredits(log.args.microCreditsBurned || 0n)
          const eth = asEth((log.args.listerWei || 0n) + (log.args.platformWei || 0n))
          rows.push({
            id: `chain_use_${log.transactionHash}`,
            wallet: address,
            kind: 'key_usage',
            eth: eth || creditsToEth(credits),
            credits,
            txHash: log.transactionHash,
            createdAt: Number(log.blockNumber) * 1000,
            blockNumber: Number(log.blockNumber),
            title: `Metered listing ${log.args.listingId}`,
            listingId: String(log.args.listingId),
          })
        }
        const claimed = await pull(() =>
          publicClient.getContractEvents({
            address: market,
            abi: apiKeyMarketplaceAbi,
            eventName: 'Claimed',
            args: { lister: address },
            fromBlock,
            toBlock: latest,
            strict: true,
          })
        )
        for (const log of claimed) {
          rows.push({
            id: `chain_clm_${log.transactionHash}`,
            wallet: address,
            kind: 'claim',
            eth: asEth(log.args.amount),
            credits: 0,
            txHash: log.transactionHash,
            createdAt: Number(log.blockNumber) * 1000,
            blockNumber: Number(log.blockNumber),
            title: `Claim listing ${log.args.listingId}`,
            listingId: String(log.args.listingId),
          })
        }
      }

      const uniqueBlocks = [...new Set(rows.map((r) => r.blockNumber).filter(Boolean))].slice(0, 48)
      const times = {}
      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: BigInt(bn) })
            times[bn] = Number(block.timestamp) * 1000
          } catch {
            /* keep blockNumber-based sort */
          }
        })
      )
      setChainRows(
        rows.map((r) => ({
          ...r,
          createdAt: times[r.blockNumber] || r.createdAt,
        }))
      )
    } catch (err) {
      setSyncError(err?.shortMessage || err?.message || 'Could not sync on-chain payments.')
    } finally {
      setSyncing(false)
    }
  }, [address, publicClient])

  useEffect(() => {
    refreshChain()
  }, [refreshChain])

  const rows = useMemo(
    () => mergePaymentLists(localRows, marketRows, chainRows),
    [localRows, marketRows, chainRows]
  )

  const analytics = useMemo(() => {
    const paid = rows.filter((r) => PAYMENT_KINDS[r.kind]?.direction === 'out')
    const earned = rows.filter((r) => PAYMENT_KINDS[r.kind]?.direction === 'in')
    const sum = (list, key) => list.reduce((n, r) => n + (Number(r[key]) || 0), 0)
    const byKind = {}
    for (const kind of Object.keys(PAYMENT_KINDS)) {
      const list = rows.filter((r) => r.kind === kind)
      byKind[kind] = {
        count: list.length,
        eth: sum(list, 'eth'),
        credits: sum(list, 'credits'),
      }
    }
    const now = Date.now()
    const days = []
    for (let i = 13; i >= 0; i--) {
      const ts = now - i * 86400000
      const key = dayKey(ts)
      const dayPaid = paid.filter((r) => dayKey(r.createdAt) === key)
      days.push({
        key,
        label: new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        eth: sum(dayPaid, 'eth'),
        count: dayPaid.length,
      })
    }
    const maxDay = Math.max(0, ...days.map((d) => d.eth))
    return {
      paidEth: sum(paid, 'eth'),
      paidCredits: sum(paid, 'credits'),
      earnedEth: sum(earned, 'eth'),
      depositEth: sum(
        rows.filter((r) => r.kind === 'ledger_deposit' || r.kind === 'key_rent'),
        'eth'
      ),
      spendCredits: sum(
        rows.filter((r) => r.kind === 'ledger_spend' || r.kind === 'key_usage'),
        'credits'
      ),
      count: rows.length,
      byKind,
      days,
      maxDay,
      claimable: myClaimable?.total || 0,
    }
  }, [rows, myClaimable])

  return {
    address,
    isConnected,
    rows,
    analytics,
    syncing,
    syncError,
    refreshChain,
  }
}
