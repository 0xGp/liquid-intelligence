import React from 'react'
import BrandLogo from '../brand/BrandLogo'
import XLink from '../brand/XLink'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Marketplace', href: '#marketplace' },
  { label: 'API Keys', href: '#api-market' },
  { label: 'List Key', href: '#list-key' },
  { label: 'Payments', href: '#payments' },
  { label: 'Earnings', href: '#earnings' },
  { label: 'How it works', href: '#about' },
]

const MARQUEE = Array.from({ length: 8 }, () => 'Liquid Intelligence')
const EASE = 'ease-[cubic-bezier(0.25,0.1,0.25,1)]'

export default function LandingFooter() {
  return (
    <footer
      className="landing-panel landing-footer relative z-10 flex min-h-[100svh] items-center bg-transparent py-20 text-foreground sm:py-24"
      data-enter
    >
      <div className="landing-panel-inner mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-14 xl:px-20">
        <div className="landing-glass-card overflow-hidden p-0">
          <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
            <h2 className="max-w-[16ch] text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.08] text-foreground">
              Generate and rent on Robinhood.
            </h2>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                className="group h-auto justify-between rounded-full bg-foreground py-2.5 ps-6 pe-2 text-[14px] text-background hover:bg-foreground"
                onClick={() => {
                  window.location.hash = '#marketplace'
                }}
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-full border-foreground/10 bg-white/55 px-6 backdrop-blur-md"
                onClick={() => {
                  window.location.hash = '#list-key'
                }}
              >
                List a key
              </Button>
            </div>
          </div>

          <div className="payrent-marquee" aria-hidden>
            <div className="payrent-marquee-track">
              {[...MARQUEE, ...MARQUEE].map((word, i) => (
                <span key={`${word}-${i}`} className="payrent-marquee-item">
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <BrandLogo nameClassName="text-[18px] sm:text-[20px]" />
              <p className="mt-3 max-w-[34ch] text-[13px] leading-relaxed text-foreground/60">
                AI infrastructure marketplace with on-chain credits on Robinhood Chain.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2.5">
              {LINKS.map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  className="group inline-flex items-center gap-1 text-[14px] font-medium text-foreground/70 transition-colors hover:text-foreground"
                >
                  {link.label}
                  <ArrowUpRight
                    size={13}
                    className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    aria-hidden
                  />
                </a>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/50 px-6 py-4 text-[12px] text-foreground/45 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <span>© 2026 Liquid Intelligence. Built on Robinhood Chain.</span>
            <div className="flex items-center gap-3">
              <XLink
                className="size-8 border border-foreground/10 bg-white/55 hover:border-foreground/20 hover:bg-white"
                markClassName="size-4"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
