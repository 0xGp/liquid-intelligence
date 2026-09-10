import { navLinks } from '../data'

export default function Footer() {
  return (
    <footer>
      <div className="footer-col">
        <a href="#" className="footer-brand">
          <img src="/assets/logo.png" alt="" />
          <strong>Vince</strong>
        </a>
        <span>A payment rail for AI agents</span>
      </div>
      <div className="footer-col">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
      <div className="footer-col">
        <a href="#" data-hover>
          GitHub
        </a>
        <a href="#" data-hover>
          X
        </a>
        <a href="#" data-hover>
          Status
        </a>
      </div>
      <div className="footer-col">
        <a href="mailto:hello@relay-pay.dev" data-hover>
          hello@relay-pay.dev
        </a>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Vince</span>
        <span>Settled in real time.</span>
      </div>
    </footer>
  )
}
