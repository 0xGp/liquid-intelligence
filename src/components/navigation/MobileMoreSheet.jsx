import React from 'react'
import { ChevronRight } from 'lucide-react'
import Sheet from '../ui/Sheet'
import { moreNav, primaryNav, isNavActive } from '../../navigation/config'

function NavRow({ item, onClose, onWallet }) {
  const Icon = item.icon
  const active = item.href ? isNavActive(item.href, window.location.hash) : false

  if (item.action === 'wallet') {
    return (
      <li>
        <button
          type="button"
          className="pr-more-row"
          onClick={() => {
            onClose?.()
            onWallet?.()
          }}
        >
          <span className="pr-more-row-left">
            <Icon size={18} strokeWidth={1.75} aria-hidden />
            {item.label}
          </span>
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </li>
    )
  }

  return (
    <li>
      <a
        href={item.href}
        className={`pr-more-row${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={onClose}
      >
        <span className="pr-more-row-left">
          <Icon size={18} strokeWidth={1.75} aria-hidden />
          {item.label}
        </span>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
      </a>
    </li>
  )
}

export default function MobileMoreSheet({ open, onClose, onWallet }) {
  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      <ul className="pr-more-list">
        {primaryNav.map((item) => (
          <NavRow key={item.href} item={item} onClose={onClose} onWallet={onWallet} />
        ))}
        {moreNav.map((item) => (
          <NavRow
            key={item.href + item.label}
            item={item}
            onClose={onClose}
            onWallet={onWallet}
          />
        ))}
      </ul>
    </Sheet>
  )
}
