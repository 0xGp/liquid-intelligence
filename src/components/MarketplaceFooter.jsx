import React from 'react'
import { Coins, Layers, ShieldCheck } from 'lucide-react'
import { useMarketplace } from '../context/MarketplaceContext'

export default function MarketplaceFooter() {
  const { marketplaceTab } = useMarketplace()
  const isText = marketplaceTab === 'text'

  const cards = [
    {
      icon: Coins,
      title: isText ? 'Per-message billing' : 'Per-second billing',
      body: isText
        ? 'Each chat send meters credits — no subscriptions, no surprise markup.'
        : 'Every model is billed for output you use — no subscriptions, no surprise markup.',
    },
    {
      icon: Layers,
      title: 'One credit pool',
      body: 'Your balance works across video models and text LLMs alike.',
    },
    {
      icon: ShieldCheck,
      title: 'Robinhood ETH settlement',
      body: 'Deposits settle in native ETH on Robinhood Chain. Verifiable, fast, non-custodial.',
    },
  ]

  return (
    <footer className="mt-16 border-t border-border pt-10 sm:mt-20">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {cards.map(({ icon: Icon, title, body }) => (
          <div key={title} className="mp-studio-card rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground">
              <Icon size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-foreground">{title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground/80">
        Results depend on the underlying provider. Availability and pricing may change without
        notice.
      </p>
    </footer>
  )
}
