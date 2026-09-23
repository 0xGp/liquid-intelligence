import React from 'react'
import { useAccount, useDisconnect, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatEther } from 'viem'
import Sheet from '../ui/Sheet'
import { useMarketplace } from '../../context/MarketplaceContext'
import { DEPOSIT_CHAIN } from '../../web3/tokens'
import { shortId } from '../../web3/agents'
import { useChain } from '../../chain/ChainContext'
import { useNearWallet } from '../../near/NearWalletContext'

export default function WalletSheet({ open, onClose }) {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { balance, openDepositFrom } = useMarketplace()
  const { isNear, copy } = useChain()
  const near = useNearWallet()
  const { data: ethBalance } = useBalance({
    address,
    chainId: DEPOSIT_CHAIN.id,
    query: { enabled: Boolean(address) && !isNear },
  })

  const ethLabel =
    ethBalance?.value != null
      ? `${Number(formatEther(ethBalance.value)).toFixed(4)} ETH`
      : '—'
  const nativeLabel = isNear
    ? near.nativeBalance == null
      ? '—'
      : `${near.nativeBalance.toFixed(4)} NEAR`
    : ethLabel
  const shownAddress = isNear ? near.accountId : address
  const shownConnected = isNear ? near.isConnected : isConnected
  const networkLabel = isNear
    ? copy.network
    : chain?.id === DEPOSIT_CHAIN.id
      ? copy.network
      : copy.wrongNetwork

  return (
    <Sheet open={open} onClose={onClose} title="Wallet">
      {!shownConnected ? (
        <div className="pr-wallet-sheet">
          <p className="pr-muted">{copy.connectHint}</p>
          <button
            type="button"
            className="pr-btn pr-btn-primary pr-btn-block"
            onClick={() => {
              onClose?.()
              if (isNear) near.connect()
              else openConnectModal?.()
            }}
          >
            {copy.connect}
          </button>
        </div>
      ) : (
        <div className="pr-wallet-sheet">
          <div className="pr-wallet-meta">
            <span className="pr-status pr-status-success">Connected</span>
            <code className="pr-mono" title={shownAddress}>
              {shortId(shownAddress)}
            </code>
            <p className="pr-muted">{networkLabel}</p>
          </div>

          <div className="pr-wallet-stats">
            <div>
              <span className="pr-label">{copy.walletAsset}</span>
              <strong>{nativeLabel}</strong>
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
            {copy.deposit}
          </button>
          <button
            type="button"
            className="pr-btn pr-btn-ghost pr-btn-block"
            onClick={() => {
              if (isNear) near.disconnect()
              else disconnect()
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
