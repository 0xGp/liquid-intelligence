import React from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useMarketplace } from '../context/MarketplaceContext'
import { DEPOSIT_CHAIN } from '../web3/tokens'
import { shortId } from '../web3/agents'

export default function TopWalletBar() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const {
    balance,
    isDepositPending,
    setDepositModalOpen,
    ledgerConfigured,
  } = useMarketplace()

  if (!isConnected) return null

  const isZero = balance <= 0
  const networkLabel = DEPOSIT_CHAIN.testnet ? 'Robinhood Testnet' : 'Robinhood Chain'

  return (
    <div className="top-wallet-bar-container">
      {isDepositPending ? (
        <div className="top-pending-banner">
          <span className="spinner-inline" />
          <span>On-chain tx pending…</span>
        </div>
      ) : null}

      <div className="top-wallet-bar">
        <div className="top-wallet-left">
          <span className="top-wallet-address" title={address}>
            {shortId(address)}
          </span>
          <span className="network-pill">{networkLabel}</span>
        </div>

        <div className="top-wallet-center">
          <span className="balance-label">
            {ledgerConfigured ? 'On-chain credits' : 'Credits'}
          </span>
          <strong className="balance-value">{balance.toFixed(2)} credits</strong>
        </div>

        <div className="top-wallet-actions">
          <button
            type="button"
            className="top-bar-btn deposit-btn"
            onClick={() => setDepositModalOpen(true)}
          >
            Deposit
          </button>
          <button type="button" className="top-bar-btn disconnect-btn" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      </div>

      {!ledgerConfigured ? (
        <div className="zero-balance-banner">
          <div className="zero-balance-content">
            <span>
              Credit ledger not configured. Deploy on testnet and set VITE_CREDIT_LEDGER_ADDRESS.
            </span>
          </div>
        </div>
      ) : isZero ? (
        <div className="zero-balance-banner">
          <div className="zero-balance-content">
            <span>No on-chain credits. Deposit ETH to the ledger before using models.</span>
          </div>
          <button
            type="button"
            className="zero-deposit-btn"
            onClick={() => setDepositModalOpen(true)}
          >
            Deposit ETH
          </button>
        </div>
      ) : null}
    </div>
  )
}
