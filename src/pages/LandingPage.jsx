import React, { lazy, Suspense, useEffect } from 'react'
import LandingHero from '../components/landing/LandingHero'
import LandingAbout from '../components/landing/LandingFeatures'
import LandingProducts from '../components/landing/LandingProducts'
import LandingFooter from '../components/landing/LandingFooter'

const ShaderBackground = lazy(() =>
  import('../components/landing/ShaderBackground').then((m) => ({
    default: m.ShaderBackground,
  })),
)

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('is-landing-scroll')
    return () => document.documentElement.classList.remove('is-landing-scroll')
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const panels = [...document.querySelectorAll('.landing-panel[data-enter] .landing-panel-inner')]
    if (reduce || !panels.length) return undefined

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.remove('is-enter-pending')
          io.unobserve(entry.target)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    )

    panels.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.88) return
      el.classList.add('is-enter-pending')
      io.observe(el)
    })

    return () => io.disconnect()
  }, [])

  return (
    <div className="relative bg-transparent text-foreground antialiased">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <Suspense fallback={<div className="h-full w-full bg-background" />}>
          <ShaderBackground />
        </Suspense>
      </div>
      <main id="main" className="relative z-10">
        <LandingHero />
        <LandingAbout />
        <LandingProducts />
      </main>
      <LandingFooter />
    </div>
  )
}
