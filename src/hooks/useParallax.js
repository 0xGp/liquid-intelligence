import { useEffect, useRef } from 'react'

/**
 * Translates an element against scroll. `speed` 0.2 means the layer moves
 * 20% slower than the page. Disabled when the user prefers reduced motion.
 */
export function useParallax(speed = 0.2) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let frame = 0
    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2
      el.style.transform = `translate3d(0, ${(fromCenter * -speed).toFixed(2)}px, 0)`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
      el.style.transform = ''
    }
  }, [speed])

  return ref
}

export default useParallax
