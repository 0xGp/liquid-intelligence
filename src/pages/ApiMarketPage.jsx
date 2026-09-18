import React, { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import {
  KEY_PROVIDERS,
  KIND_LABELS,
  formatCredits,
  minRentEth,
} from '../web3/apiKeyMarket'
import { shortId } from '../web3/agents'

export default function ApiMarketPage() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const {
    listings,
    rentListing,
    openStudio,
    rentalForListing,
    busy,
    lastError,
    setLastError,
    txUrl,
    platformFeeBps,
  } = useApiKeyMarket()

  const [kindFilter, setKindFilter] = useState('all')
  const [rentAmount, setRentAmount] = useState('0.001')
  const [activeId, setActiveId] = useState(null)
  const [status, setStatus] = useState('')

  const publicListings = useMemo(() => {
    let list = listings.filter((l) => l.status === 'active')
    if (kindFilter !== 'all') list = list.filter((l) => l.kind === kindFilter)
    return list
  }, [listings, kindFilter])

  const goBack = () => {
    window.location.hash = '#'
  }

  const onRent = async (listing) => {
    setLastError(null)
    setStatus('')
    setActiveId(listing.id)
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    try {
      setStatus(`Depositing ${rentAmount} ETH to treasury for ${listing.title}…`)
      const rental = await rentListing(listing.id, rentAmount)
      setStatus(
        `Rented. +${formatCredits(rental.creditsTotal)} credits on this key. Tx ${shortId(rental.txHash)}`
      )
    } catch {
      setStatus('')
    }
  }

  const onUse = async (listing) => {
    setLastError(null)
    setStatus('')
    setActiveId(listing.id)
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    try {
      const studio = listing.kind === 'video' || listing.kind === 'image' ? 'video' : 'chat'
      setStatus(`Decrypting vault key · opening ${studio} studio…`)
      const session = await openStudio(listing.id)
      setStatus(
        `Unlocked ${session.keyMasked} · ${session.title}. Opening ${session.studio} studio…`
      )
    } catch (err) {
      setStatus('')
      setLastError(err.message)
    }
  }

  return (
    <div className="ak-page">
      <button type="button" className="mp-back" onClick={goBack} aria-label="Back">
        ←
      </button>
      <header className="ak-bar">
        <div className="ak-bar-title">
          <h1>API key market</h1>
          <p>
            Rent listed keys with ETH. Usage meters credits; {platformFeeBps / 100}% stays in
            treasury, the rest accrues to the lister.
          </p>
        </div>
        <div className="ak-bar-actions">
          <a className="ak-ghost-btn" href="#list-key">
            List your key
          </a>
          <a className="ak-solid-btn" href="#earnings">
            Earnings
          </a>
        </div>
      </header>

      <div className="ak-flow">
        <div className="ak-toolbar">
          <div className="filter-group" role="tablist">
            {[
              { id: 'all', label: 'All' },
              { id: 'chat', label: 'Text' },
              { id: 'video', label: 'Video' },
              { id: 'image', label: 'Image' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-btn ${kindFilter === f.id ? 'is-active' : ''}`}
                onClick={() => setKindFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="ak-rent-amount">
            <span>Rent deposit (ETH)</span>
            <input
              type="number"
              min={minRentEth()}
              step="0.001"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
            />
          </label>
        </div>

        {(status || lastError || txUrl) && (
          <div className="ak-status-strip">
            {status && <p className="ak-status-ok">{status}</p>}
            {lastError && <p className="ak-status-err">{lastError}</p>}
            {txUrl && (
              <a href={txUrl} target="_blank" rel="noreferrer" className="ak-tx-link">
                View deposit on explorer →
              </a>
            )}
          </div>
        )}

        <div className="ak-listing-grid">
          {publicListings.map((listing) => {
            const provider =
              KEY_PROVIDERS.find((p) => p.id === listing.provider)?.label ||
              listing.provider
            const rental = rentalForListing(listing.id)
            const isOwn =
              listing.owner &&
              rental?.renter &&
              listing.owner.toLowerCase() === rental.renter.toLowerCase()

            return (
              <article key={listing.id} className="ak-listing-card">
                <div className="ak-listing-top">
                  <span className="ak-kind-pill">{KIND_LABELS[listing.kind] || listing.kind}</span>
                  {listing.demo && <span className="ak-demo-pill">Sample</span>}
                </div>
                <h2>{listing.title}</h2>
                <p className="ak-listing-meta">
                  {provider} · {listing.keyMasked} · owner {shortId(listing.owner)}
                </p>
                <p className="ak-listing-desc">{listing.description}</p>
                <div className="ak-listing-stats">
                  <div>
                    <strong>${listing.pricePerCallCredits.toFixed(2)}</strong>
                    <span>credits / call</span>
                  </div>
                  <div>
                    <strong>{listing.totalCalls || 0}</strong>
                    <span>calls metered</span>
                  </div>
                </div>
                {rental && (
                  <p className="ak-rental-balance">
                    Your credits on this key:{' '}
                    <strong>{formatCredits(rental.creditsRemaining)}</strong> /{' '}
                    {formatCredits(rental.creditsTotal)}
                  </p>
                )}
                <div className="ak-listing-actions">
                  <button
                    type="button"
                    className="ak-solid-btn"
                    disabled={busy && activeId === listing.id}
                    onClick={() => onRent(listing)}
                  >
                    {busy && activeId === listing.id
                      ? 'Confirming…'
                      : `Deposit ${rentAmount} ETH`}
                  </button>
                  <button
                    type="button"
                    className="ak-ghost-btn"
                    disabled={busy || !rental || rental.creditsRemaining <= 0 || listing.demo}
                    onClick={() => onUse(listing)}
                  >
                    {listing.kind === 'video' || listing.kind === 'image'
                      ? 'Decrypt · open video'
                      : 'Decrypt · open chat'}
                  </button>
                </div>
                {isOwn && (
                  <p className="ak-note">You cannot meaningfully rent your own demo path here.</p>
                )}
              </article>
            )
          })}
        </div>

        {publicListings.length === 0 && (
          <p className="ak-empty">
            No active listings. <a href="#list-key">List the first key</a>.
          </p>
        )}
      </div>
    </div>
  )
}
