import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

function originFrom(rect, dest) {
  if (!rect) {
    return {
      x: dest.left + dest.width * 0.14,
      y: dest.top + dest.height * 0.1,
      w: dest.width * 0.72,
      h: dest.height * 0.46,
    }
  }
  return rect
}

/**
 * Landing-aligned zoom popup. Docks as a studio sheet, or centers as a modal,
 * always FLIP-zooming from `origin` over a dimmed page.
 */
export default function StudioSheet({
  open,
  onClose,
  origin,
  label,
  children,
  wide = false,
  center = false,
}) {
  const panelRef = useRef(null)
  const [shown, setShown] = useState(open)
  const lastOrigin = useRef(origin)

  if (open && origin) lastOrigin.current = origin

  useEffect(() => {
    if (open) setShown(true)
  }, [open])

  useEffect(() => {
    if (!shown) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [shown, onClose])

  useEffect(() => {
    const panel = panelRef.current
    if (!shown || !panel) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dest = panel.getBoundingClientRect()
    const from = originFrom(lastOrigin.current, dest)
    const dx = from.x - dest.left
    const dy = from.y - dest.top
    const sx = Math.min(1, Math.max(0.38, from.w / dest.width))
    const duration = reduce ? 140 : open ? 460 : 280

    panel.style.transformOrigin = 'top left'
    panel.style.willChange = 'transform, opacity, filter'

    const zoomIn = {
      transform: `translate(${dx}px, ${dy}px) scale(${sx})`,
      opacity: 0.4,
      filter: reduce ? 'none' : 'blur(8px)',
    }
    const rest = { transform: 'none', opacity: 1, filter: 'none' }

    const anim = panel.animate(open ? [zoomIn, rest] : [rest, zoomIn], {
      duration,
      easing: EASE,
      fill: 'forwards',
    })

    const done = () => {
      panel.style.willChange = ''
      if (!open) setShown(false)
    }
    anim.onfinish = done
    return () => anim.cancel()
  }, [shown, open])

  if (!shown) return null

  return (
    <div className={cn('fixed inset-0', center ? 'z-[820]' : 'z-[700]')} role="presentation">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-[#111318]/20 backdrop-blur-[2px] transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: open ? '320ms' : '200ms' }}
        aria-label="Close"
        onClick={onClose}
      />
      {center ? (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:p-6">
          <aside
            ref={panelRef}
            className="studio-sheet-panel pointer-events-auto relative flex max-h-[90svh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-md"
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
          </aside>
        </div>
      ) : (
        <aside
          ref={panelRef}
          className={cn(
            'studio-sheet-panel absolute flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-md',
            'inset-x-3 bottom-3 top-auto max-h-[90svh] rounded-2xl',
            'lg:inset-y-5 lg:right-5 lg:left-auto lg:max-h-none',
            wide ? 'lg:w-[min(520px,42vw)]' : 'lg:w-[min(460px,38vw)]',
          )}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </aside>
      )}
    </div>
  )
}
