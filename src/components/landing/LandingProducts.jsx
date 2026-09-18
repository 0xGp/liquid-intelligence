import React from 'react'
import { ArrowUpRight, Clapperboard, KeyRound, MessageSquareText, WalletCards } from 'lucide-react'

const PRODUCTS = [
  {
    icon: Clapperboard,
    title: 'Video studio',
    description: 'Kling, Gemini Omni, Opper, and Sora — billed per second of output you use.',
    href: '#marketplace',
    cta: 'Open video',
    featured: true,
  },
  {
    icon: MessageSquareText,
    title: 'Text LLMs',
    description: 'Professional chat workspace with model select, usage, and sticky composer.',
    href: '#marketplace',
    cta: 'Open chat',
  },
  {
    icon: KeyRound,
    title: 'API key market',
    description: 'Rent listed keys with ETH. Ciphertext on-chain; decrypt only in the vault proxy.',
    href: '#api-market',
    cta: 'Browse keys',
  },
  {
    icon: WalletCards,
    title: 'Payments & earnings',
    description: 'Deposits, spends, rents, and claims in one readable ledger on Robinhood.',
    href: '#payments',
    cta: 'View payments',
  },
]

export default function LandingProducts() {
  const featured = PRODUCTS.find((p) => p.featured)
  const rest = PRODUCTS.filter((p) => !p.featured)

  return (
    <section className="landing-panel flex min-h-[100svh] items-center bg-transparent" data-enter>
      <div className="landing-panel-inner mx-auto w-full max-w-[1280px] px-5 py-24 sm:px-8 sm:py-28 lg:px-14 xl:px-20">
        <h2 className="mb-10 max-w-[20ch] text-center text-[clamp(1.875rem,5vw,3.25rem)] leading-[1.08] text-foreground sm:mb-14 sm:mx-auto">
          Everything in one marketplace
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {featured ? <ProductCard item={featured} featured /> : null}
          {rest.map((item) => (
            <ProductCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductCard({ item, featured = false }) {
  const Icon = item.icon
  return (
    <a
      href={item.href}
      className={
        featured
          ? 'landing-glass-card group flex flex-col justify-between p-6 sm:p-8 lg:col-span-3 lg:flex-row lg:items-end lg:gap-10'
          : 'landing-glass-card group flex flex-col p-5 sm:p-6'
      }
    >
      <div className={featured ? 'max-w-xl' : ''}>
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-foreground text-background">
          <Icon size={26} strokeWidth={1.55} aria-hidden />
        </span>
        <h3 className={`mt-5 font-semibold text-foreground ${featured ? 'text-[22px] sm:text-[26px]' : 'text-[17px] sm:text-lg'}`}>
          {item.title}
        </h3>
        <p className={`mt-2 leading-relaxed text-foreground/65 ${featured ? 'text-[15px] sm:text-[17px]' : 'text-[14px]'}`}>
          {item.description}
        </p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
        {item.cta}
        <ArrowUpRight
          size={16}
          className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </a>
  )
}
