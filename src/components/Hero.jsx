import React, { useRef, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useMarketplace } from '../context/MarketplaceContext'
import { shortId } from '../web3/agents'

export default function Hero() {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { balance, openDepositFrom } = useMarketplace()

  const prevConnected = useRef(isConnected)
  useEffect(() => {
    if (!prevConnected.current && isConnected) {
      setTimeout(() => {
        window.location.hash = '#marketplace'
      }, 400)
    }
    prevConnected.current = isConnected
  }, [isConnected])

  const goToMarketplace = () => {
    window.location.hash = '#marketplace'
  }

  return (
    <section className="hero" id="hero">
      <div className="hero-inner">
        {!isConnected ? (
          <>
            <p className="hero-kicker">Payrent</p>
            <h1 className="hero-headline">
              AI infrastructure marketplace
            </h1>
            <p className="hero-subhead-spec">
              Generate AI. Rent API access. Pay only for what you use — settled in ETH on
              Robinhood Chain.
            </p>
            <div className="hero-cta-row">
              <button type="button" className="hero-cta-primary" onClick={goToMarketplace}>
                Explore Marketplace
              </button>
              <button type="button" className="hero-cta-secondary" onClick={() => openConnectModal?.()}>
                Connect Robinhood
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hero-kicker">Wallet {shortId(address)}</p>
            <h1 className="hero-headline">{balance.toFixed(2)} credits</h1>
            <p className="hero-subhead-spec">
              Deposit ETH on Robinhood mainnet, then open the marketplace to generate or chat.
            </p>
            <div className="hero-cta-row">
              <button type="button" className="hero-cta-primary" onClick={goToMarketplace}>
                Open Marketplace
              </button>
              <button
                type="button"
                className="hero-cta-secondary"
                onClick={(e) => openDepositFrom(e.currentTarget)}
              >
                Deposit ETH
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
