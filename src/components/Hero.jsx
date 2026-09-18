import React, { useRef, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useLiquid } from '../hooks/useLiquid'
import { useMarketplace } from '../context/MarketplaceContext'
import { shortId } from '../web3/agents'

export default function Hero() {
  const heroRef = useRef(null)
  const canvasRef = useRef(null)
  useLiquid(heroRef, canvasRef)

  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { balance, setDepositModalOpen } = useMarketplace()

  // When wallet connects, auto-navigate to marketplace
  const prevConnected = useRef(isConnected)
  useEffect(() => {
    if (!prevConnected.current && isConnected) {
      // Wallet just connected — route to marketplace
      setTimeout(() => {
        window.location.hash = '#marketplace'
      }, 400)
    }
    prevConnected.current = isConnected
  }, [isConnected])

  const goToMarketplace = () => {
    window.location.hash = '#marketplace'
  }

  const handleConnect = () => {
    openConnectModal?.()
  }

  return (
    <section className="hero" ref={heroRef}>
      <canvas id="liquidCanvas" ref={canvasRef} aria-hidden="true" />
      <div className="hero-inner">
        {!isConnected ? (
          <>
            <div className="hero-kicker">Video models · Settled on Robinhood Chain</div>
            <h1 className="hero-headline">
              <span className="line">Agents rent models.</span>
              <span className="line">Per second. Real time.</span>
            </h1>
            <p className="hero-subhead-spec">
              Connect your wallet, deposit Robinhood ETH, and use every major video model from one credit balance.
            </p>
            <div className="hero-cta-group">
              <button type="button" className="hero-connect-btn" onClick={handleConnect} data-hover>
                Connect wallet
              </button>
              <button type="button" className="hero-explore-btn" onClick={goToMarketplace} data-hover>
                Browse models
              </button>
            </div>
            <div className="hero-foot">
              <span>Veo · Kling · Hailuo · Runway · Open-Sora</span>
              <span className="scroll-cue" onClick={goToMarketplace}>
                Marketplace
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="hero-kicker">Wallet {shortId(address)} · {balance.toFixed(2)} credits</div>
            <h1 className="hero-headline">
              <span className="line">Your marketplace</span>
              <span className="line">is live.</span>
            </h1>
            <p className="hero-subhead-spec">
              Pick a model, set the shot, and settle per second of output. Nothing invoiced.
            </p>
            <div className="hero-cta-group">
              <button type="button" className="hero-connect-btn" onClick={goToMarketplace} data-hover>
                Open marketplace
              </button>
              <button
                type="button"
                className="hero-explore-btn"
                onClick={() => setDepositModalOpen(true)}
                data-hover
              >
                Deposit ETH
              </button>
            </div>
            <div className="hero-foot">
              <span>Billed per second · settled in Robinhood ETH</span>
              <span className="scroll-cue" onClick={goToMarketplace}>
                Choose model
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
