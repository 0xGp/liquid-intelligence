import React, { useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { ArrowLeft, MessageSquare, Plus, Video, Wallet, X } from 'lucide-react'
import MarketplaceGrid from '../components/MarketplaceGrid'
import ConfigPanel from '../components/ConfigPanel'
import TextChatPanel from '../components/TextChatPanel'
import VideoResultModal from '../components/VideoResultModal'
import MarketplaceFooter from '../components/MarketplaceFooter'
import MarketplaceBanner from '../components/marketplace/MarketplaceBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMarketplace } from '../context/MarketplaceContext'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import { shortId } from '../web3/agents'
import { DEPOSIT_CHAIN } from '../web3/tokens'
import { useChain } from '../chain/ChainContext'
import { useNearWallet } from '../near/NearWalletContext'

const TABS = [
  { id: 'video', label: 'Video', icon: Video },
  { id: 'text', label: 'Text LLMs', icon: MessageSquare },
]

export default function MarketplacePage() {
  const { isConnected: ethConnected, address: ethAddress } = useAccount()
  const chainId = useChainId()
  const { openConnectModal } = useConnectModal()
  const { isNear, copy } = useChain()
  const near = useNearWallet()
  const isConnected = isNear ? near.isConnected : ethConnected
  const address = isNear ? near.accountId : ethAddress
  const {
    balance,
    openDepositFrom,
    marketplaceTab,
    setMarketplaceTab,
    openStudioFrom,
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
        openStudioFrom()
      } else if (studio === 'video') {
        setMarketplaceTab('video')
        openStudioFrom()
      }
    }
    window.addEventListener('vince:open-studio', onStudio)
    return () => window.removeEventListener('vince:open-studio', onStudio)
  }, [setMarketplaceTab, openStudioFrom])

  useEffect(() => {
    if (!activeRental) return
    if (activeRental.studio === 'chat') {
      setMarketplaceTab('text')
      openStudioFrom()
    } else if (activeRental.studio === 'video') {
      setMarketplaceTab('video')
      openStudioFrom()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => {
    window.location.hash = '#'
    window.scrollTo({ top: 0 })
  }

  const onDepositChain = isNear || chainId === DEPOSIT_CHAIN.id
  const openDeposit = (el) => {
    if (!isConnected) {
      if (isNear) near.connect()
      else openConnectModal?.()
      return
    }
    openDepositFrom(el)
  }

  const isText = marketplaceTab === 'text'
  const rentalBalance = activeRental ? rentalForListing(activeRental.listingId) : null

  return (
    <div className="min-h-screen bg-[#F0F1F4]">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-24 sm:px-8 lg:px-14 xl:px-20">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mb-8 size-10 rounded-full bg-card"
          onClick={goBack}
          aria-label="Back to home"
        >
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
        </Button>

        <MarketplaceBanner />

        {activeRental && (
          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">Rented key active</p>
              <p className="mt-1 truncate text-[13px] text-muted-foreground">
                {activeRental.title} · {activeRental.keyMasked} · {activeRental.provider} ·{' '}
                {activeRental.studio === 'chat' ? 'chat' : 'video'}
                {rentalBalance
                  ? ` · ${rentalBalance.creditsRemaining.toFixed(2)} rental credits left`
                  : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-full bg-background px-5"
              onClick={clearStudio}
            >
              <X size={15} strokeWidth={2} aria-hidden />
              Clear rented key
            </Button>
          </div>
        )}

        <header className="flex flex-col items-start gap-8">
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-[40rem]">
              <Badge variant="outline" className="border-border bg-card px-3.5 py-1.5 text-[12px]">
                Studio
              </Badge>
              <h1 className="mt-6 text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] text-foreground">
                Marketplace
              </h1>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
                {activeRental
                  ? `Using vault-proxied ${activeRental.provider} key — billed from rental credits.`
                  : copy.studio}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isConnected ? (
                <>
                  <span
                    className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-[12px] font-medium text-muted-foreground"
                    title={address}
                  >
                    {shortId(address)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex h-10 items-center rounded-full border px-4 text-[12px] font-medium',
                      onDepositChain
                        ? 'border-border bg-card text-muted-foreground'
                        : 'border-amber-300 bg-amber-50 text-amber-700',
                    )}
                  >
                    {onDepositChain ? copy.network : copy.wrongNetwork}
                  </span>
                  <span className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-[12px] font-semibold text-background">
                    {balance.toFixed(2)} credits
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-h-10 rounded-full bg-card px-5"
                    onClick={(e) => openDeposit(e.currentTarget)}
                  >
                    <Plus size={15} strokeWidth={2} aria-hidden />
                    {copy.deposit}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-border bg-card px-6"
                  onClick={() => (isNear ? near.connect() : openConnectModal?.())}
                >
                  <Wallet size={15} strokeWidth={2} aria-hidden />
                  {copy.connect}
                </Button>
              )}
            </div>
          </div>

          <div
            className="inline-flex w-full gap-1 self-start rounded-full border border-border bg-card p-1 sm:w-auto"
            role="tablist"
            aria-label="Marketplace category"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = marketplaceTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors duration-200 sm:flex-none',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                  onClick={() => setMarketplaceTab(tab.id)}
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </header>

        <div id="marketplace-catalog">
          <MarketplaceGrid />
        </div>
        <MarketplaceFooter />
      </div>

      {isText ? <TextChatPanel /> : <ConfigPanel />}
      {!isText && <VideoResultModal />}
    </div>
  )
}
