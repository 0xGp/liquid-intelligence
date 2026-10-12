import React, { useEffect, useMemo, useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatEther } from 'viem'
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarketplace } from '../context/MarketplaceContext'
import StudioSheet from './marketplace/StudioSheet'
import {
  DEPOSIT_CHAIN,
  MIN_DEPOSIT_ETH,
  CREDITS_PER_ETH,
  ethToCredits,
} from '../web3/tokens'
import { explorerTx, shortId } from '../web3/agents'
import { useChain } from '../chain/ChainContext'
import { useNearWallet } from '../near/NearWalletContext'
import { CREDITS_PER_NEAR, MIN_ATTACHED_NEAR, nearExplorerTx, nearToYocto } from '../near/rpc'
import { useNearLedger } from '../near/NearLedgerContext'

const PRESETS = [0.001, 0.005, 0.01, 0.05]
const NEAR_PRESETS = [0.003, 0.01, 0.05, 0.1]

const chip =
  'inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-secondary'
const chipOn =
  'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background'

export default function DepositModal() {
  const {
    depositModalOpen,
    setDepositModalOpen,
    depositOrigin,
    depositEth,
    isDepositPending,
    setIsDepositPending,
    ledgerConfigured,
    ledgerAddress,
    refreshBalance,
    balance,
  } = useMarketplace()
  const { address: ethAddress, isConnected: ethConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { isNear, copy } = useChain()
  const near = useNearWallet()
  const nearLedger = useNearLedger()
  const isConnected = isNear ? near.isConnected : ethConnected
  const address = isNear ? near.accountId : ethAddress
  const asset = copy.asset
  const rate = isNear ? CREDITS_PER_NEAR : CREDITS_PER_ETH
  const minDeposit = isNear ? MIN_ATTACHED_NEAR : MIN_DEPOSIT_ETH
  const presets = isNear ? NEAR_PRESETS : PRESETS

  const [amount, setAmount] = useState(() => String(isNear ? MIN_ATTACHED_NEAR : MIN_DEPOSIT_ETH))
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')
  const [txHash, setTxHash] = useState(null)
  const [headline, setHeadline] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAmount(String(minDeposit))
  }, [minDeposit])

  const creditsPreview = isNear
    ? Math.max(0, (parseFloat(amount) || 0) - 0.0015) * CREDITS_PER_NEAR
    : ethToCredits(parseFloat(amount) || 0)
  const num = parseFloat(amount)
  const amountValid = !Number.isNaN(num) && num >= minDeposit

  const { data: ethBalance, refetch: refetchBalance } = useBalance({
    address: ethAddress,
    chainId: DEPOSIT_CHAIN.id,
    query: { enabled: Boolean(ethAddress) && !isNear },
  })

  const walletBalance = useMemo(() => {
    if (isNear) return near.nativeBalance
    if (!ethBalance?.value) return null
    try {
      return Number(formatEther(ethBalance.value))
    } catch {
      return null
    }
  }, [ethBalance, isNear, near.nativeBalance])

  const close = () => {
    setDepositModalOpen(false)
    setError('')
    setStatus('')
    setTxHash(null)
  }

  const handleCopy = async () => {
    if (!ledgerAddress) return
    await navigator.clipboard?.writeText(ledgerAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const runDeposit = async () => {
    setError('')
    setStatus('')
    if (!isConnected || !address) {
      setError(isNear ? 'Connect a NEAR wallet first.' : 'Connect an Ethereum wallet first.')
      return
    }
    if (!ledgerConfigured || !ledgerAddress) {
      setError(`Credit ledger not configured. Deploy and set ${copy.ledgerEnv}.`)
      return
    }
    if (!amountValid) {
      setError(`Enter at least ${minDeposit} ${asset}.`)
      return
    }

    setIsDepositPending(true)
    try {
      if (isNear) {
        if (near.nativeYocto != null && BigInt(near.nativeYocto) < nearToYocto(num)) {
          throw new Error(
            `Not enough NEAR in this wallet. Balance: ${
              walletBalance != null ? walletBalance.toFixed(6) : '—'
            } NEAR`,
          )
        }
      } else if (ethBalance?.value != null) {
        const need = BigInt(Math.round(num * 1e18))
        if (ethBalance.value < need) {
          throw new Error(
            `Not enough ETH in this wallet. Balance: ${
              walletBalance != null ? walletBalance.toFixed(6) : '—'
            } ETH`,
          )
        }
      }

      setStatus(`Confirm ${num} ${asset} in your wallet…`)
      const result = await depositEth(num)
      setHeadline(`+${Number(result.credits).toFixed(2)} credits`)
      setTxHash(result.hash)
      if (isNear) await near.refreshNative?.()
      else await refetchBalance?.()
      await refreshBalance?.()
      setStatus(
        `Deposited ${num} ${asset}. +${result.credits.toFixed(2)} credits (${rate.toLocaleString()} / ${asset}).`,
      )
    } catch (err) {
      setError(err?.shortMessage || err?.message || 'Deposit failed.')
      setStatus('')
    } finally {
      setIsDepositPending(false)
    }
  }

  const txUrl = txHash ? (isNear ? nearExplorerTx(txHash) : explorerTx(DEPOSIT_CHAIN, txHash)) : null
  const done = Boolean(txHash)

  return (
    <StudioSheet
      open={depositModalOpen}
      onClose={close}
      origin={depositOrigin}
      label={copy.deposit}
      center
    >
      <header className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[1.375rem] leading-tight text-foreground">
              {copy.deposit}
            </h2>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">
              {copy.network} · {rate.toLocaleString()} credits / {asset}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
            onClick={close}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5">
          {done ? (
            <div className="flex flex-col gap-3">
              <p className="font-serif text-[1.75rem] leading-tight text-foreground">
                {headline}
              </p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{status}</p>
              {txUrl && (
                <a
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline-offset-2 hover:underline"
                  href={txUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on explorer
                  <ExternalLink size={13} strokeWidth={2} aria-hidden />
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="deposit-eth-amount" className="text-[13px] font-medium text-foreground">
                  Amount
                </label>
                <div className="flex items-baseline gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-[3px] focus-within:ring-ring/40">
                  <input
                    id="deposit-eth-amount"
                    type="number"
                    min={minDeposit}
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-serif text-[1.75rem] leading-none text-foreground outline-none placeholder:text-muted-foreground/50"
                    placeholder={String(minDeposit)}
                  />
                  <span className="text-[13px] font-medium text-muted-foreground">{asset}</span>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  ≈{' '}
                  <strong className="font-semibold text-foreground">
                    {creditsPreview.toFixed(2)}
                  </strong>{' '}
                  credits
                  {amountValid ? '' : ` · min ${minDeposit} ${asset}`}
                  {isNear ? ' · a new account keeps a little NEAR for storage' : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {presets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={cn(chip, amount === String(val) && chipOn)}
                    onClick={() => setAmount(String(val))}
                  >
                    {val} {asset}
                  </button>
                ))}
              </div>

              {isConnected && (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  From {shortId(address)}
                  {walletBalance != null ? ` · ${walletBalance.toFixed(6)} ${asset}` : ''}
                  {` · ${balance.toFixed(2)} credits`}
                </p>
              )}

              {ledgerAddress && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                  <span className="truncate" title={ledgerAddress}>
                    Ledger {shortId(ledgerAddress)}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={12} strokeWidth={2} aria-hidden /> : <Copy size={12} strokeWidth={2} aria-hidden />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {!ledgerConfigured && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
                  <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    Ledger not deployed. Set <code className="font-medium">{copy.ledgerEnv}</code>.
                  </span>
                </div>
              )}

              {status && !done && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">{status}</p>
              )}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
                  <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
        {done ? (
          <button
            type="button"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[14px] font-semibold text-background transition-opacity hover:opacity-92"
            onClick={close}
          >
            Done
          </button>
        ) : !isConnected ? (
          <button
            type="button"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[14px] font-semibold text-background transition-opacity hover:opacity-92"
            onClick={() => (isNear ? near.connect() : openConnectModal?.())}
          >
            {copy.connect}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={cn(
                'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-semibold text-background transition-opacity hover:opacity-92 disabled:opacity-40',
              )}
              disabled={isDepositPending || !ledgerConfigured || !amountValid}
              onClick={runDeposit}
            >
              {isDepositPending && <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden />}
              {isDepositPending ? 'Confirming…' : `Deposit ${amount || 0} ${asset}`}
            </button>
            {isNear && balance > 0 && (
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-background text-[13px] font-semibold text-foreground disabled:opacity-40"
                disabled={isDepositPending || !ledgerConfigured}
                onClick={async () => {
                  setError('')
                  setStatus('Confirm the return in your wallet…')
                  setIsDepositPending(true)
                  try {
                    const result = await nearLedger.redeemCredits()
                    setHeadline(`Returned ${result.credits.toFixed(2)} credits`)
                    setStatus(`Returned ${result.credits.toFixed(2)} credits as NEAR.`)
                    setTxHash(result.hash)
                    await near.refreshNative?.()
                  } catch (err) {
                    setError(err?.message || 'Return failed.')
                    setStatus('')
                  } finally {
                    setIsDepositPending(false)
                  }
                }}
              >
                Return unused credits as NEAR
              </button>
            )}
          </>
        )}
        {!done && (
          <p className="text-center text-[12px] text-muted-foreground">
            Min {minDeposit} {asset} · credits mint to this wallet
          </p>
        )}
      </div>
    </StudioSheet>
  )
}
