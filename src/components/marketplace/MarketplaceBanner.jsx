import React, { useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useChain } from '../../chain/ChainContext'
import { withoutRobinhood } from '../../chain/visibility'

const EASE = 'ease-[cubic-bezier(0.25,0.1,0.25,1)]'

const SLIDES = [
  {
    title: 'List your API key',
    bodyKey: 'bannerList',
    cta: 'List a key',
    href: '#list-key',
  },
  {
    title: 'Rent listed keys',
    bodyKey: 'bannerRent',
    cta: 'Browse keys',
    href: '#api-market',
  },
  {
    title: 'Generate in the studio',
    bodyKey: 'bannerStudio',
    cta: 'See models',
    href: '#marketplace-catalog',
  },
]

export default function MarketplaceBanner() {
  const { copy } = useChain()
  const slides = withoutRobinhood(SLIDES)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const safeIndex = index % slides.length
  const current = slides[safeIndex]
  const slide = { ...current, body: copy[current.bodyKey] }

  useEffect(() => {
    if (paused) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, 6500)
    return () => window.clearInterval(id)
  }, [paused, slides.length])

  const go = (next) => {
    setIndex((next + slides.length) % slides.length)
  }

  const onCta = () => {
    if (slide.href === '#marketplace-catalog') {
      document.getElementById('marketplace-catalog')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      return
    }
    window.location.hash = slide.href
  }

  return (
    <section
      className="relative mb-10 overflow-hidden rounded-3xl bg-foreground text-background shadow-[0_12px_32px_rgba(17,19,24,0.12)]"
      aria-roledescription="carousel"
      aria-label="Marketplace promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      <img
        src="/brand/lx-mark.png"
        alt=""
        className="pointer-events-none absolute -right-24 top-1/2 size-[20rem] -translate-y-1/2 object-contain opacity-40 sm:-right-28 sm:size-[24rem] sm:opacity-90 lg:right-[-5rem] lg:size-[28rem]"
      />

      <div className="relative flex min-h-[20rem] flex-col justify-between gap-10 px-6 pb-6 pt-8 sm:min-h-[22rem] sm:px-10 sm:pb-7 sm:pt-10 lg:min-h-[24rem] lg:px-12">
        <div className="max-w-[36rem]" aria-live="polite">
          <h2 className="font-serif text-[clamp(2rem,4.8vw,3.35rem)] leading-[1.06] tracking-[-0.02em]">
            {slide.title}
          </h2>
          <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-background/70 sm:text-[16px]">
            {slide.body}
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Button
            type="button"
            size="lg"
            className="group h-auto w-fit justify-between rounded-full bg-background py-2.5 ps-6 pe-2 text-[14px] text-foreground hover:bg-background"
            onClick={onCta}
          >
            {slide.cta}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
              <ArrowRight
                className={cn(
                  'size-3.5 text-background transition-transform duration-500 group-hover:-rotate-45',
                  EASE,
                )}
              />
            </span>
          </Button>

          {slides.length > 1 ? (
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center">
              {slides.map((item, i) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Show ${item.title}`}
                  aria-current={i === index ? 'true' : undefined}
                  className="inline-flex h-8 items-center justify-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50"
                  onClick={() => go(i)}
                >
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      EASE,
                      i === index ? 'w-6 bg-background' : 'w-1.5 bg-background/35',
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous slide"
                className="inline-flex size-9 items-center justify-center rounded-full border border-background/15 bg-background/10 text-background transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50"
                onClick={() => go(safeIndex - 1)}
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                className="inline-flex size-9 items-center justify-center rounded-full border border-background/15 bg-background/10 text-background transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50"
                onClick={() => go(safeIndex + 1)}
              >
                <ChevronRight size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
