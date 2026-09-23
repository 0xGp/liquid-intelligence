import { ConnectButton } from '@rainbow-me/rainbowkit'
import { shortId } from '../web3/agents'
import { useChain } from '../chain/ChainContext'
import { useNearWallet } from '../near/NearWalletContext'

export default function WalletButton() {
  const { isNear, copy } = useChain()
  const near = useNearWallet()

  if (isNear) {
    if (!near.isConnected) {
      return (
        <button type="button" className="wallet-btn" onClick={() => near.connect()} data-hover>
          {copy.connect}
        </button>
      )
    }
    return (
      <button
        type="button"
        className="wallet-btn"
        onClick={() => near.disconnect()}
        title={near.accountId}
      >
        {shortId(near.accountId)}
      </button>
    )
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = ready && account && chain

        if (!connected) {
          return (
            <button type="button" className="wallet-btn" onClick={openConnectModal} data-hover>
              Connect Robinhood
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button type="button" className="wallet-btn is-warn" onClick={openChainModal}>
              Wrong chain
            </button>
          )
        }

        return (
          <div className="wallet-pair">
            <button type="button" className="wallet-btn wallet-btn-chain" onClick={openChainModal}>
              {chain.name.replace('Robinhood Chain', 'Robinhood')}
            </button>
            <button type="button" className="wallet-btn" onClick={openAccountModal} title={account.address}>
              {shortId(account.address)}
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
