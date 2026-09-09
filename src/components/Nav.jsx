import { useState } from 'react'
import { navLinks } from '../data'
import WalletButton from './WalletButton'

export default function Nav() {
  const [open, setOpen] = useState(false)

  const close = () => {
    setOpen(false)
    document.body.style.overflow = ''
  }

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      document.body.style.overflow = next ? 'hidden' : ''
      return next
    })
  }

  return (
    <nav className={open ? 'is-open' : ''}>
      <a href="#" className="nav-mark" onClick={close}>
        VINCE
      </a>
      <div className="nav-links">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={close}>
            {link.label}
          </a>
        ))}
      </div>
      <div className="nav-end">
        <WalletButton />
        <button
          className="nav-burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={toggle}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  )
}
