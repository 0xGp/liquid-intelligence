import React from 'react'

export default function KeyRentSection() {
  return (
    <section className="key-rent-section" id="key-rent">
      <div className="key-rent-inner">
        <div className="key-rent-copy">
          <h2>
            List your API key.
            <br />
            Earn when others call it.
          </h2>
          <p>
            Publish OpenAI, Gemini, Kling, or Opper keys. Renters deposit Robinhood ETH to the
            Vince treasury. Every metered call burns credits — your share settles back as payment
            for the key, minus a clear platform fee.
          </p>
          <div className="key-rent-actions">
            <a href="#list-key" className="key-rent-primary" data-hover>
              List a key
            </a>
            <a href="#api-market" className="key-rent-secondary" data-hover>
              Browse API market
            </a>
          </div>
        </div>

        <ol className="key-rent-flow">
          <li>
            <strong>List</strong>
            <span>Set price per call. Secret stays masked to renters.</span>
          </li>
          <li>
            <strong>Rent</strong>
            <span>Users deposit ETH to treasury for credits on your key.</span>
          </li>
          <li>
            <strong>Meter</strong>
            <span>Each call deducts credits and accrues your ETH share.</span>
          </li>
          <li>
            <strong>Claim</strong>
            <span>Pull earnings from the treasury ledger on-chain.</span>
          </li>
        </ol>
      </div>
    </section>
  )
}
