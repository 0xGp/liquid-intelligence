import React, { useMemo, useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { useMarketplace } from '../context/MarketplaceContext'
import {
  DEPOSIT_CHAIN,
  MIN_DEPOSIT_ETH,
  CREDITS_PER_ETH,
  ethToCredits,
} from '../web3/tokens'
import { explorerTx, shortId } from '../web3/agents'

const PRESETS = [0.001, 0.005, 0.01, 0.05]

export default function DepositModal() {
  const {
    depositModalOpen,
    setDepositModalOpen,
    depositEth,
    isDepositPending,
    setIsDepositPending,
    ledgerConfigured,
    ledgerAddress,
    refreshBalance,
  } = useMarketplace()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState(String(MIN_DEPOSIT_ETH))
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')
  const [txHash, setTxHash] = useState(null)
  const [error, setError] = useState('')

  const isTestnet = DEPOSIT_CHAIN.testnet === true
  const creditsPreview = ethToCredits(parseFloat(amount) || 0)

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

  if (!depositModalOpen) return null

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
    const num = parseFloat(amount)
    if (!isConnected || !address) {
      setError('Connect Robinhood Wallet first.')
      return
    }
    if (!ledgerConfigured || !ledgerAddress) {
      setError('Credit ledger not configured. Deploy and set VITE_CREDIT_LEDGER_ADDRESS.')
      return
    }
    if (Number.isNaN(num) || num < MIN_DEPOSIT_ETH) {
      setError(`Enter at least ${MIN_DEPOSIT_ETH} ETH.`)
      return
    }

    setIsDepositPending(true)
    try {
      const valueWei = ethBalance?.value
      // rough client-side check; contract enforces min
      if (valueWei != null) {
        const need = BigInt(Math.round(num * 1e18))
        if (valueWei < need) {
          throw new Error(
            `Not enough ETH in this wallet. Balance: ${
              walletBalance != null ? walletBalance.toFixed(6) : '—'
            } ETH`
          )
        }
      }

      setStatus(`Confirm ${num} ETH deposit to CreditLedger in your wallet…`)
      const result = await depositEth(num)
      setTxHash(result.hash)
      await refetchBalance?.()
      await refreshBalance?.()
      setStatus(
        `Deposited ${num} ETH. +${result.credits.toFixed(2)} credits on-chain for ${shortId(address)} (${CREDITS_PER_ETH} credits / ETH).`
      )
    } catch (err) {
      setError(err?.shortMessage || err?.message || 'Deposit failed.')
      setStatus('')
    } finally {
      setIsDepositPending(false)
    }
  }

  const txUrl = txHash ? explorerTx(DEPOSIT_CHAIN, txHash) : null

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card deposit-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h3>
              Deposit ETH · {isTestnet ? 'Robinhood Testnet' : 'Robinhood Chain'}
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="modal-body-copy">
          Pay into the on-chain CreditLedger. Credits mint to your connected wallet and are
          required before any model use. Min {MIN_DEPOSIT_ETH} ETH ·{' '}
          {CREDITS_PER_ETH.toLocaleString()} credits / ETH
          {creditsPreview > 0 ? ` · this deposit ≈ ${creditsPreview.toFixed(2)} credits` : ''}.
        </p>

        {!isConnected && (
          <p className="deposit-warn">Connect Robinhood Wallet to deposit from this app.</p>
        )}

        {!ledgerConfigured && (
          <p className="deposit-warn">
            Ledger not deployed. Run <code>node scripts/deploy-credit-ledger.mjs</code> and set{' '}
            <code>VITE_CREDIT_LEDGER_ADDRESS</code>.
          </p>
        )}

        <div className="deposit-address-box">
          <div className="deposit-info" style={{ gridColumn: '1 / -1' }}>
            <span className="deposit-label">CreditLedger contract (escrow)</span>
            <code className="deposit-code" title={ledgerAddress || ''}>
              {ledgerAddress || 'Not configured'}
            </code>
            <div className="deposit-addr-actions">
              <button
                type="button"
                className="deposit-copy-btn"
                onClick={handleCopy}
                disabled={!ledgerAddress}
              >
                {copied ? 'Copied' : 'Copy address'}
              </button>
              {address && (
                <span className="deposit-wallet-hint">
                  From {shortId(address)}
                  {walletBalance != null ? ` · ${walletBalance.toFixed(6)} ETH` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="deposit-quick-actions">
          <label className="deposit-label">Amount ETH (min {MIN_DEPOSIT_ETH})</label>
          <div className="deposit-preset-row">
            {PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                className={`preset-btn ${amount === String(val) ? 'is-active' : ''}`}
                onClick={() => setAmount(String(val))}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="deposit-input-row">
            <input
              type="number"
              min={MIN_DEPOSIT_ETH}
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="deposit-input"
              placeholder="ETH amount"
            />
            <button
              type="button"
              className="deposit-submit-btn"
              disabled={
                isDepositPending ||
                !isConnected ||
                !ledgerConfigured ||
                !amount ||
                parseFloat(amount) < MIN_DEPOSIT_ETH
              }
              onClick={runDeposit}
            >
              {isDepositPending ? 'Confirming…' : `Deposit ${amount || 0} ETH`}
            </button>
          </div>
        </div>

        {status && <p className="deposit-status">{status}</p>}
        {error && <p className="deposit-error">{error}</p>}
        {txUrl && (
          <a className="deposit-tx-link" href={txUrl} target="_blank" rel="noreferrer">
            View on explorer →
          </a>
        )}

        <div className="deposit-notes">
          <div className="deposit-note-item">
            <span className="dot" />
            <span>
              Robinhood Testnet (chain id {DEPOSIT_CHAIN.id}) — credits are verified on-chain.
            </span>
          </div>
          <div className="deposit-note-item">
            <span className="dot" />
            <strong>
              Min {MIN_DEPOSIT_ETH} ETH · {CREDITS_PER_ETH.toLocaleString()} credits / ETH
            </strong>
          </div>
          <div className="deposit-note-item">
            <span className="dot" />
            <span>Each model call asks you to confirm a spend tx that burns credits.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
