import React from 'react'
import { useMarketplace } from '../context/MarketplaceContext'

export default function MarketplaceFooter() {
  const { marketplaceTab } = useMarketplace()
  const isText = marketplaceTab === 'text'

  return (
    <footer className="marketplace-trust-footer">
      <div className="trust-grid">
        <div className="trust-card">
          <h4>{isText ? 'Per-message billing' : 'Per-second billing'}</h4>
          <p>
            {isText
              ? 'Each chat send meters credits — no subscriptions, no surprise markup.'
              : 'Every model is billed for output you use — no subscriptions, no surprise markup.'}
          </p>
        </div>
        <div className="trust-card">
          <h4>One credit pool</h4>
          <p>Your balance works across video models and text LLMs alike.</p>
        </div>
        <div className="trust-card">
          <h4>Robinhood ETH settlement</h4>
          <p>Deposits settle in native ETH on Robinhood Chain. Verifiable, fast, non-custodial.</p>
        </div>
      </div>
      <p className="trust-fine-print">
        Results depend on the underlying provider. Availability and pricing may change without notice.
      </p>
    </footer>
  )
}
