import React, { useMemo, useState } from 'react'
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

const PRESETS = [0.001, 0.005, 0.01, 0.05]

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
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const [amount, setAmount] = useState(String(MIN_DEPOSIT_ETH))
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')
  const [txHash, setTxHash] = useState(null)
  const [error, setError] = useState('')

  const creditsPreview = ethToCredits(parseFloat(amount) || 0)
  const num = parseFloat(amount)
  const amountValid = !Number.isNaN(num) && num >= MIN_DEPOSIT_ETH

  const { data: ethBalance, refetch: refetchBalance } = useBalance({
    address,
    chainId: DEPOSIT_CHAIN.id,
    query: { enabled: Boolean(address) },
  })

  const walletBalance = useMemo(() => {
    if (!ethBalance?.value) return null
    try {
      return Number(formatEther(ethBalance.value))
    } catch {
      return null
    }
  }, [ethBalance])

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
      setError('Connect Robinhood Wallet first.')
      return
    }
    if (!ledgerConfigured || !ledgerAddress) {
      setError('Credit ledger not configured. Deploy and set VITE_CREDIT_LEDGER_ADDRESS.')
      return
    }
    if (!amountValid) {
      setError(`Enter at least ${MIN_DEPOSIT_ETH} ETH.`)
      return
    }

    setIsDepositPending(true)
    try {
      const valueWei = ethBalance?.value
      if (valueWei != null) {
        const need = BigInt(Math.round(num * 1e18))
        if (valueWei < need) {
          throw new Error(
            `Not enough ETH in this wallet. Balance: ${
              walletBalance != null ? walletBalance.toFixed(6) : '—'
            } ETH`,
          )
        }
      }

      setStatus(`Confirm ${num} ETH in your wallet…`)
      const result = await depositEth(num)
      setTxHash(result.hash)
      await refetchBalance?.()
      await refreshBalance?.()
      setStatus(
        `Deposited ${num} ETH. +${result.credits.toFixed(2)} credits (${CREDITS_PER_ETH.toLocaleString()} / ETH).`,
      )
    } catch (err) {
      setError(err?.shortMessage || err?.message || 'Deposit failed.')
      setStatus('')
    } finally {
      setIsDepositPending(false)
    }
  }

  const txUrl = txHash ? explorerTx(DEPOSIT_CHAIN, txHash) : null
  const done = Boolean(txHash)

  return (
    <StudioSheet
      open={depositModalOpen}
      onClose={close}
      origin={depositOrigin}
      label="Deposit ETH"
      center
    >
      <header className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[1.375rem] leading-tight text-foreground">
              Deposit ETH
            </h2>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">
              Robinhood Chain · {CREDITS_PER_ETH.toLocaleString()} credits / ETH
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
                +{ethToCredits(num).toFixed(2)} credits
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
                    min={MIN_DEPOSIT_ETH}
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-serif text-[1.75rem] leading-none text-foreground outline-none placeholder:text-muted-foreground/50"
                    placeholder={String(MIN_DEPOSIT_ETH)}
                  />
                  <span className="text-[13px] font-medium text-muted-foreground">ETH</span>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  ≈{' '}
                  <strong className="font-semibold text-foreground">
                    {creditsPreview.toFixed(2)}
                  </strong>{' '}
                  credits
                  {amountValid ? '' : ` · min ${MIN_DEPOSIT_ETH} ETH`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={cn(chip, amount === String(val) && chipOn)}
                    onClick={() => setAmount(String(val))}
                  >
                    {val} ETH
                  </button>
                ))}
              </div>

              {isConnected && (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  From {shortId(address)}
                  {walletBalance != null ? ` · ${walletBalance.toFixed(6)} ETH` : ''}
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
                    Ledger not deployed. Set <code className="font-medium">VITE_CREDIT_LEDGER_ADDRESS</code>.
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
            onClick={() => openConnectModal?.()}
          >
            Connect Wallet to Deposit
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-semibold text-background transition-opacity hover:opacity-92 disabled:opacity-40',
            )}
            disabled={isDepositPending || !ledgerConfigured || !amountValid}
            onClick={runDeposit}
          >
            {isDepositPending && <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden />}
            {isDepositPending ? 'Confirming…' : `Deposit ${amount || 0} ETH`}
          </button>
        )}
        {!done && (
          <p className="text-center text-[12px] text-muted-foreground">
            Min {MIN_DEPOSIT_ETH} ETH · credits mint to this wallet
          </p>
        )}
      </div>
    </StudioSheet>
  )
}
