import { useState } from 'react'
import { navLinks } from '../data'

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
      <div className="nav-mark">VINCE</div>
      <div className="nav-links">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={close}>
            {link.label}
          </a>
        ))}
      </div>
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
    </nav>
  )
}
