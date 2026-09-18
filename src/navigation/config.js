/**
 * Shared navigation config — desktop + mobile consume the same source.
 */
import {
  Store,
  KeyRound,
  PlusCircle,
  CreditCard,
  CircleHelp,
  BarChart3,
  Wallet,
  Info,
} from 'lucide-react'

export const primaryNav = [
  { label: 'Marketplace', href: '#marketplace', icon: Store },
  { label: 'API Keys', href: '#api-market', icon: KeyRound },
  { label: 'List Key', href: '#list-key', icon: PlusCircle, mobileLabel: 'List' },
]

export const moreNav = [
  { label: 'How it works', href: '#about', icon: CircleHelp },
  { label: 'Earnings', href: '#earnings', icon: BarChart3 },
  { label: 'Wallet', href: '#wallet', icon: Wallet, action: 'wallet' },
  { label: 'About', href: '#', icon: Info },
]

export function isNavActive(href, hash) {
  const h = hash || (typeof window !== 'undefined' ? window.location.hash : '') || '#'
  if (href === '#' || href === '') {
    return h === '#' || h === '' || h === '#work'
  }
  if (href === '#about') {
    return h === '#about' || (h === '#' && false)
  }
  return h === href || h.startsWith(`${href}?`)
}
