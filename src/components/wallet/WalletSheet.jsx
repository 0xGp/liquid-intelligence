import React from 'react'
import { useAccount, useDisconnect, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatEther } from 'viem'
import Sheet from '../ui/Sheet'
import { useMarketplace } from '../../context/MarketplaceContext'
import { DEPOSIT_CHAIN } from '../../web3/tokens'
import { shortId } from '../../web3/agents'

export default function WalletSheet({ open, onClose }) {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { balance, openDepositFrom } = useMarketplace()
  const { data: ethBalance } = useBalance({
    address,
    chainId: DEPOSIT_CHAIN.id,
    query: { enabled: Boolean(address) },
  })

  const ethLabel =
    ethBalance?.value != null
      ? `${Number(formatEther(ethBalance.value)).toFixed(4)} ETH`
      : '—'

  return (
    <Sheet open={open} onClose={onClose} title="Wallet">
      {!isConnected ? (
        <div className="pr-wallet-sheet">
          <p className="pr-muted">Connect Robinhood Wallet on Robinhood Chain mainnet.</p>
          <button
            type="button"
            className="pr-btn pr-btn-primary pr-btn-block"
            onClick={() => {
              onClose?.()
              openConnectModal?.()
            }}
          >
            Connect Robinhood
          </button>
        </div>
      ) : (
        <div className="pr-wallet-sheet">
          <div className="pr-wallet-meta">
            <span className="pr-status pr-status-success">Connected</span>
            <code className="pr-mono" title={address}>
              {shortId(address)}
            </code>
            <p className="pr-muted">
              {chain?.id === DEPOSIT_CHAIN.id
                ? 'Robinhood Chain'
                : 'Switch to Robinhood mainnet'}
            </p>
          </div>

          <div className="pr-wallet-stats">
            <div>
              <span className="pr-label">Wallet ETH</span>
              <strong>{ethLabel}</strong>
            </div>
            <div>
              <span className="pr-label">Credits</span>
              <strong>{balance.toFixed(2)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="pr-btn pr-btn-primary pr-btn-block"
            onClick={(e) => {
              openDepositFrom(e.currentTarget)
              onClose?.()
            }}
          >
            Deposit ETH
          </button>
          <button
            type="button"
            className="pr-btn pr-btn-ghost pr-btn-block"
            onClick={() => {
              disconnect()
              onClose?.()
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </Sheet>
  )
}
