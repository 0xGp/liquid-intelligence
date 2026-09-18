import React, { useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import MarketplaceGrid from '../components/MarketplaceGrid'
import ConfigPanel from '../components/ConfigPanel'
import TextChatPanel from '../components/TextChatPanel'
import VideoResultModal from '../components/VideoResultModal'
import MarketplaceFooter from '../components/MarketplaceFooter'
import { useMarketplace } from '../context/MarketplaceContext'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import { shortId } from '../web3/agents'
import { DEPOSIT_CHAIN } from '../web3/tokens'

export default function MarketplacePage() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { openConnectModal } = useConnectModal()
  const {
    balance,
    setDepositModalOpen,
    promptDrawerOpen,
    setPromptDrawerOpen,
    marketplaceTab,
    setMarketplaceTab,
  } = useMarketplace()
  const { activeRental, clearStudio, rentalForListing } = useApiKeyMarket()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.body.classList.add('rail-mode')
    return () => document.body.classList.remove('rail-mode')
  }, [])

  useEffect(() => {
    const onStudio = (e) => {
      const studio = e.detail?.studio
      if (studio === 'chat') {
        setMarketplaceTab('text')
        setPromptDrawerOpen(true)
      } else if (studio === 'video') {
        setMarketplaceTab('video')
        setPromptDrawerOpen(true)
      }
    }
    window.addEventListener('vince:open-studio', onStudio)
    return () => window.removeEventListener('vince:open-studio', onStudio)
  }, [setMarketplaceTab, setPromptDrawerOpen])

  // If we land with an active rental already, open the matching studio
  useEffect(() => {
    if (!activeRental) return
    if (activeRental.studio === 'chat') {
      setMarketplaceTab('text')
      setPromptDrawerOpen(true)
    } else if (activeRental.studio === 'video') {
      setMarketplaceTab('video')
      setPromptDrawerOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => {
    window.location.hash = '#'
    window.scrollTo({ top: 0 })
  }

  const onDepositChain = chainId === DEPOSIT_CHAIN.id
  const openDeposit = () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setDepositModalOpen(true)
  }

  const isText = marketplaceTab === 'text'
  const rentalBalance = activeRental
    ? rentalForListing(activeRental.listingId)
    : null

  return (
    <div className={`mp-page${promptDrawerOpen ? ' has-drawer' : ''}`}>
      <button type="button" className="mp-back" onClick={goBack} aria-label="Back">
        ←
      </button>

      {activeRental && (
        <div className="mp-rental-banner">
          <div>
            <strong>Rented key active</strong>
            <span>
              {activeRental.title} · {activeRental.keyMasked} · {activeRental.provider} ·{' '}
              {activeRental.studio === 'chat' ? 'chat' : 'video'}
              {rentalBalance
                ? ` · ${rentalBalance.creditsRemaining.toFixed(2)} rental credits left`
                : ''}
            </span>
          </div>
          <button type="button" className="mp-bar-deposit" onClick={clearStudio}>
            Clear rented key
          </button>
        </div>
      )}

      <header className="mp-bar">
        <div className="mp-bar-title">
          <h1>Marketplace</h1>
          <p>
            {activeRental
              ? `Using vault-proxied ${activeRental.provider} key — billed from rental credits`
              : isText
                ? 'Rent text LLMs · chat billed per message on Robinhood Testnet'
                : 'Rent video models · settle from 0.001 ETH on Robinhood Testnet'}
          </p>
          <div className="mp-category-tabs" role="tablist" aria-label="Marketplace category">
            <button
              type="button"
              role="tab"
              aria-selected={!isText}
              className={`mp-category-tab ${!isText ? 'is-active' : ''}`}
              onClick={() => setMarketplaceTab('video')}
            >
              Video
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isText}
              className={`mp-category-tab ${isText ? 'is-active' : ''}`}
              onClick={() => setMarketplaceTab('text')}
            >
              Text LLMs
            </button>
          </div>
        </div>

        <div className="mp-bar-session">
          {isConnected ? (
            <>
              <div className="mp-bar-pills">
                <span className="mp-pill" title={address}>
                  {shortId(address)}
                </span>
                <span className={`mp-pill ${onDepositChain ? 'is-ok' : 'is-warn'}`}>
                  {onDepositChain ? 'Robinhood Testnet' : 'Switch to testnet'}
                </span>
                <span className="mp-pill is-balance">
                  {balance.toFixed(2)} credits
                </span>
              </div>
              <button type="button" className="mp-bar-deposit" onClick={openDeposit}>
                Deposit ETH
              </button>
            </>
          ) : (
            <button type="button" className="mp-bar-deposit" onClick={openConnectModal}>
              Connect Robinhood
            </button>
          )}
        </div>
      </header>

      <div className="mp-flow">
        <MarketplaceGrid />
        <MarketplaceFooter />
      </div>

      {isText ? <TextChatPanel /> : <ConfigPanel />}
      {!isText && <VideoResultModal />}
    </div>
  )
}
