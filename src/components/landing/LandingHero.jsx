import React from 'react'
import { ArrowRight } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useChain } from '../../chain/ChainContext'
import { useNearWallet } from '../../near/NearWalletContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EASE = 'ease-[cubic-bezier(0.25,0.1,0.25,1)]'

export default function LandingHero() {
  const { isConnected: ethConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { isNear, copy } = useChain()
  const near = useNearWallet()
  const isConnected = isNear ? near.isConnected : ethConnected

  const goMarketplace = () => {
    window.location.hash = '#marketplace'
  }

  return (
    <section className="landing-panel relative flex min-h-[100svh] flex-col bg-transparent">
      <div className="landing-panel-inner relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-center justify-center px-5 pb-20 pt-32 text-center sm:px-8 lg:px-14 xl:px-20">
        <h1 className="mx-auto max-w-[22ch] text-[clamp(2.5rem,8vw,5rem)] leading-[1.04] text-foreground">
          AI infrastructure marketplace
        </h1>
        <p className="mx-auto mt-6 max-w-[52ch] text-[15px] leading-relaxed text-foreground/70 sm:text-lg">
          {copy.hero}
        </p>

        <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <Button
            type="button"
            size="lg"
            className="group h-auto justify-between rounded-full bg-primary py-2.5 ps-6 pe-2 text-[14px] text-primary-foreground hover:bg-[#96be1c]"
            onClick={goMarketplace}
          >
            Explore Marketplace
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
              <ArrowRight
                className={cn(
                  'size-3.5 text-foreground transition-transform duration-500 group-hover:-rotate-45',
                  EASE,
                )}
              />
            </span>
          </Button>
          {!isConnected ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-6"
              onClick={() => (isNear ? near.connect() : openConnectModal?.())}
            >
              {copy.connect}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-6"
              onClick={goMarketplace}
            >
              Open studio
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
