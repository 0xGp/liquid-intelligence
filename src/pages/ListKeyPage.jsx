import React, { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import { KEY_PROVIDERS, KIND_LABELS, maskApiKey } from '../web3/apiKeyMarket'
import { isVaultPublicKeyConfigured } from '../web3/vaultCrypto'
import { shortId } from '../web3/agents'

export default function ListKeyPage() {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { createListing, myListings, pauseListing, platformFeeBps, onChainEnabled, vaultReady, marketAddress } =
    useApiKeyMarket()

  const [provider, setProvider] = useState('openai')
  const [kind, setKind] = useState('chat')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0.05')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const kinds = useMemo(() => {
    const p = KEY_PROVIDERS.find((x) => x.id === provider)
    return p?.kinds || ['chat']
  }, [provider])

  const goBack = () => {
    window.location.hash = '#'
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDone(null)
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setBusy(true)
    try {
      const listing = await createListing({
        provider,
        kind,
        title,
        description,
        pricePerCallCredits: price,
        apiKey,
      })
      setDone(listing)
      setApiKey('')
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(err?.shortMessage || err?.message || 'Could not publish listing.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ak-page">
      <button type="button" className="mp-back" onClick={goBack} aria-label="Back">
        ←
      </button>
      <header className="ak-bar">
        <div className="ak-bar-title">
          <h1>List an API key</h1>
          <p>
            Publish a key for others to rent. Renters deposit ETH to the Vince treasury; each
            metered call pays you {(10000 - platformFeeBps) / 100}% after the platform fee.
          </p>
        </div>
        <div className="ak-bar-actions">
          <a className="ak-ghost-btn" href="#api-market">
            Browse market
          </a>
          <a className="ak-solid-btn" href="#earnings">
            Your earnings
          </a>
        </div>
      </header>

      <div className="ak-flow ak-flow-split">
        <form className="ak-form" onSubmit={onSubmit}>
          <h2 className="ak-form-title">New listing</h2>
          <p className="ak-form-lead">
            Connected as {address ? shortId(address) : '—'}. Your key is sealed to the Vince vault
            public key before it leaves this browser. On-chain storage is ciphertext only.
          </p>
          <p className="ak-form-lead">
            Vault pubkey:{' '}
            {isVaultPublicKeyConfigured() ? 'RSA ready' : 'invalid — run generate-vault-keys.mjs'} ·
            Server decrypt: {vaultReady === false ? 'private key missing' : vaultReady ? 'ready' : '…'} ·
            Market:{' '}
            {onChainEnabled ? shortId(marketAddress) : 'not set (local sealed fallback)'}
          </p>

          <div className="ak-form-grid">
            <label className="ak-field">
              <span>Provider</span>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value)
                  const nextKinds =
                    KEY_PROVIDERS.find((p) => p.id === e.target.value)?.kinds || ['chat']
                  if (!nextKinds.includes(kind)) setKind(nextKinds[0])
                }}
              >
                {KEY_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="ak-field">
              <span>Capability</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k] || k}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="ak-field">
            <span>Listing title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. OpenAI gpt-4o-mini lane"
              required
            />
          </label>

          <label className="ak-field">
            <span>What renters get</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rate limits, model names, and any usage notes."
              required
            />
          </label>

          <label className="ak-field">
            <span>Price per metered call (credits)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>

          <label className="ak-field">
            <span>API key</span>
            <div className="ak-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-… / AIza… / op-…"
                autoComplete="off"
                required
              />
              <button type="button" className="ak-ghost-btn" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {apiKey && (
              <small className="ak-hint">Public mask: {maskApiKey(apiKey)}</small>
            )}
          </label>

          {error && <p className="ak-status-err">{error}</p>}
          {done && (
            <p className="ak-status-ok">
              Listed <strong>{done.title}</strong>. Renters can deposit ETH on the market page.
            </p>
          )}

          <button type="submit" className="ak-solid-btn ak-submit" disabled={busy}>
            {!isConnected
              ? 'Connect wallet to list'
              : busy
                ? 'Publishing…'
                : 'Publish listing'}
          </button>
        </form>

        <aside className="ak-side">
          <h2 className="ak-form-title">How payout works</h2>
          <ol className="ak-steps">
            <li>UI seals your API key to Vince’s vault public key (RSA-OAEP + AES-GCM).</li>
            <li>Ciphertext is written on-chain (Robinhood testnet) — never plaintext.</li>
            <li>Renter deposits ETH → credits. On Use, vault decrypts ciphertext server-side.</li>
            <li>
              {(10000 - platformFeeBps) / 100}% of burned ETH accrues to you; claim from Earnings.
            </li>
          </ol>

          <h3 className="ak-side-sub">Your listings</h3>
          {myListings.length === 0 ? (
            <p className="ak-empty-sm">No listings from this wallet yet.</p>
          ) : (
            <ul className="ak-mine-list">
              {myListings.map((l) => (
                <li key={l.id}>
                  <div>
                    <strong>{l.title}</strong>
                    <span>
                      {l.status} · {l.keyMasked} · ${l.pricePerCallCredits}/call
                    </span>
                  </div>
                  <button type="button" className="ak-ghost-btn" onClick={() => pauseListing(l.id)}>
                    {l.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
