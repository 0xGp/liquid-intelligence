import React from 'react'
import { ArrowRight, Coins, KeyRound, Sparkles, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChain } from '../../chain/ChainContext'
import { SHOW_ROBINHOOD } from '../../chain/visibility'

const STEPS = [
  { t: 'Deposit', d: '', icon: Wallet },
  { t: 'Generate', d: 'Run video or chat in the studio.', icon: Sparkles },
  { t: 'Rent', d: 'Unlock vault-proxied API keys.', icon: KeyRound },
  { t: 'Earn', d: 'Claim your share from listings.', icon: Coins },
]

export default function LandingAbout() {
  const { copy } = useChain()
  const steps = STEPS.filter((step) => SHOW_ROBINHOOD || (step.t !== 'Rent' && step.t !== 'Earn')).map((step) =>
    step.t === 'Deposit' ? { ...step, d: copy.depositStep } : step,
  )
  return (
    <section id="about" className="landing-panel flex min-h-[100svh] items-center bg-transparent" data-enter>
      <div className="landing-panel-inner mx-auto w-full max-w-[1280px] px-5 py-24 sm:px-8 sm:py-28 lg:px-14 xl:px-20">
        <div className="flex flex-col items-center text-center">
          <h2 className="max-w-[24ch] text-[clamp(1.875rem,4.5vw,3rem)] leading-[1.1] text-foreground">
            Metered AI access. On-chain settlement. One credit pool.
          </h2>

          <p className="mx-auto mt-6 max-w-[60ch] text-[15px] leading-[1.7] text-foreground/70 sm:text-[17px]">
            {copy.about}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full px-6 py-2.5">
              <a href="#marketplace" className="inline-flex items-center gap-1.5">
                Browse models <ArrowRight className="size-4" />
              </a>
            </Button>
            {SHOW_ROBINHOOD ? (
            <Button asChild variant="outline" className="rounded-full bg-white/50 px-6 py-2.5 backdrop-blur-md">
              <a href="#list-key">List a key</a>
            </Button>
            ) : null}
          </div>
        </div>

        <ol className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <li key={step.t} className="landing-glass-card flex flex-col p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon size={22} strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="font-serif text-[22px] leading-none text-foreground/25">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-[16px] font-semibold text-foreground">{step.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">{step.d}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
