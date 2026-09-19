import React, { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { useAccount } from 'wagmi'
import { cn } from '@/lib/utils'
import { primaryNav, isNavActive } from '../../navigation/config'
import BrandLogo from '../brand/BrandLogo'
import XLink from '../brand/XLink'
import WalletButton from '../WalletButton'
import CircleMenu from './CircleMenu'
import WalletSheet from '../wallet/WalletSheet'

export default function AppNav() {
  const [hash, setHash] = useState(() => window.location.hash || '#')
  const [menuOpen, setMenuOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const { isConnected } = useAccount()

  useEffect(() => {
    const onHash = () => {
      setHash(window.location.hash || '#')
      setMenuOpen(false)
      setWalletOpen(false)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const onLanding = !hash || hash === '#' || hash === '#work' || hash === '#about'

  const links = [
    ...primaryNav,
  ]

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[500] px-3 pt-3 sm:px-5">
        <div
          className={cn(
            'pointer-events-auto mx-auto grid max-w-[1280px] grid-cols-[1fr_auto] items-center gap-3 rounded-full border px-2 py-1.5 md:grid-cols-[1fr_auto_1fr] md:px-3',
            'border-black/8 bg-white text-foreground shadow-[0_8px_24px_rgba(17,19,24,0.08)]',
            'md:border-white/40 md:bg-white/25 md:shadow-[0_8px_32px_rgba(17,19,24,0.08)] md:backdrop-blur-2xl',
          )}
        >
          <BrandLogo className="relative z-10 justify-self-start ps-1" />

          <nav
            className="relative z-10 hidden items-center gap-1 justify-self-center md:flex"
            aria-label="Primary"
          >
            {links.map((item) => {
              const active = isNavActive(item.href, hash)
              return (
                <a
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-white/50 hover:text-foreground',
                    active && 'bg-white/70 text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="relative z-10 flex items-center justify-self-end gap-0.5 sm:gap-1">
            <XLink />
            <div className="hidden md:block">
              <WalletButton />
            </div>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full bg-foreground text-background md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {!onLanding && <div className="h-[4.75rem]" aria-hidden />}

      <CircleMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onWallet={() => setWalletOpen(true)}
        isConnected={isConnected}
      />
      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  )
}
