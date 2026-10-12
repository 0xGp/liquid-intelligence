import { navLinks } from '../data'

export default function Footer() {
  return (
    <footer>
      <div className="footer-col">
        <a href="#" className="footer-brand">
          <img src="/assets/logo.png" alt="" />
          <strong>Vince</strong>
        </a>
        <span>Ethereum Video Generation Marketplace</span>
      </div>
      <div className="footer-col">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
      <div className="footer-col">
        <a href="#marketplace" data-hover>
          Browse Models
        </a>
        <a href="#api-market" data-hover>
          API key market
        </a>
        <a href="#payments" data-hover>
          Payments
        </a>
        <a href="#list-key" data-hover>
          List a key
        </a>
      </div>
      <div className="footer-col">
        <a href="mailto:hello@relay-pay.dev" data-hover>
          hello@relay-pay.dev
        </a>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Vince · Built on Ethereum</span>
        <span>Every model, one balance. Billed per second.</span>
      </div>
    </footer>
  )
}
