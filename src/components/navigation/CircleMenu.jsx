import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import BrandLogo from '../brand/BrandLogo'
import { cn } from '@/lib/utils'
import { primaryNav } from '../../navigation/config'

const MENU_LINKS = [
  ...primaryNav,
  { label: 'How it works', href: '#about' },
  { label: 'Earnings', href: '#earnings' },
]

export default function CircleMenu({ open, onClose, onWallet, isConnected }) {
  useEffect(() => {
    if (!open) return undefined
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
  }, [open, onClose])

  return (
    <div
      className={cn('circle-menu-mask z-[640] md:hidden', open && 'is-open')}
      aria-hidden={!open}
      inert={open ? undefined : true}
    >
      <div
        className={cn(
          'relative flex h-full flex-col bg-white px-6 pb-10 pt-5 text-foreground transition-opacity duration-300',
          open ? 'opacity-100 delay-150' : 'opacity-0',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between">
          <BrandLogo onClick={onClose} />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full bg-foreground text-background"
            onClick={onClose}
            aria-label="Close menu"
            tabIndex={open ? 0 : -1}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <nav className="flex flex-1 flex-col justify-center gap-2" aria-label="Mobile">
          {MENU_LINKS.map((item, i) => (
            <a
              key={item.href + item.label}
              href={item.href}
              onClick={onClose}
              tabIndex={open ? 0 : -1}
              className="font-serif text-[clamp(2rem,8vw,2.75rem)] leading-[1.15] text-foreground transition-transform duration-300 hover:translate-x-1"
              style={{
                transitionDelay: open ? `${120 + i * 45}ms` : '0ms',
                transform: open ? 'none' : 'translateY(12px)',
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[14px] font-semibold text-background"
          onClick={() => {
            onClose?.()
            onWallet?.()
          }}
          tabIndex={open ? 0 : -1}
        >
          {isConnected ? 'Wallet' : 'Connect Robinhood'}
        </button>
      </div>
    </div>
  )
}
