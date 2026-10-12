import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import { formatCredits, formatEthShort } from '../web3/apiKeyMarket'
import { shortId } from '../web3/agents'
import { useChain } from '../chain/ChainContext'
import { useNearWallet } from '../near/NearWalletContext'

export default function EarningsPage() {
  const { isConnected: ethConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { copy, isNear } = useChain()
  const near = useNearWallet()
  const isConnected = isNear ? near.isConnected : ethConnected
  const {
    myClaimable,
    myListings,
    myRentals,
    claims,
    claimEarnings,
    busy,
    lastError,
    setLastError,
    txUrl,
    platformFeeBps,
    address,
  } = useApiKeyMarket()

  const [status, setStatus] = useState('')
  const [activeId, setActiveId] = useState(null)

  const goBack = () => {
    window.location.hash = '#'
  }

  const onClaim = async (listingId) => {
    setLastError(null)
    setStatus('')
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setActiveId(listingId)
    try {
      setStatus('Confirm claim settlement in wallet…')
      const claim = await claimEarnings(listingId)
      setStatus(
        `Claimed ${formatEthShort(claim.ethAmount)} ${copy.asset} · tx ${shortId(claim.txHash)}`
      )
    } catch {
      setStatus('')
    }
  }

  return (
    <div className="ak-page">
      <button type="button" className="mp-back" onClick={goBack} aria-label="Back">
        ←
      </button>
      <header className="ak-bar">
        <div className="ak-bar-title">
          <h1>Key earnings</h1>
          <p>
            {isNear
              ? copy.earningsLead
              : `Usage fees from rented keys. Platform keeps ${platformFeeBps / 100}%; claim the rest to your wallet on Ethereum.`}
          </p>
        </div>
        <div className="ak-bar-actions">
          <a className="ak-ghost-btn" href="#payments">
            Payments
          </a>
          <a className="ak-ghost-btn" href="#list-key">
            List a key
          </a>
          <a className="ak-solid-btn" href="#api-market">
            API market
          </a>
        </div>
      </header>

      <div className="ak-flow">
        {!isConnected ? (
          <div className="ak-connect-card">
            <p>{copy.earningsConnect}</p>
            <button type="button" className="ak-solid-btn" onClick={() => (isNear ? near.connect() : openConnectModal?.())}>
              Connect wallet
            </button>
          </div>
        ) : (
          <>
            <div className="ak-earn-hero">
              <div>
                <p className="ak-earn-label">Total earnings</p>
                <p className="ak-earn-value">
                  {formatEthShort(
                    myClaimable.rows.reduce((s, r) => s + (r.listerEth || 0), 0)
                  )}{' '}
                  {copy.asset}
                </p>
              </div>
              <div>
                <p className="ak-earn-label">Claimable</p>
                <p className="ak-earn-value">{formatEthShort(myClaimable.total)} {copy.asset}</p>
              </div>
              <div>
                <p className="ak-earn-label">Usage</p>
                <p className="ak-earn-value">
                  {myClaimable.rows.reduce((s, r) => s + (r.calls || 0), 0).toLocaleString()} calls
                </p>
              </div>
            </div>

            {(status || lastError || txUrl) && (
              <div className="ak-status-strip">
                {status && <p className="ak-status-ok">{status}</p>}
                {lastError && <p className="ak-status-err">{lastError}</p>}
                {txUrl && (
                  <a href={txUrl} target="_blank" rel="noreferrer" className="ak-tx-link">
                    View claim tx →
                  </a>
                )}
              </div>
            )}

            <section className="ak-section">
              <h2>Listings you own</h2>
              {myClaimable.rows.length === 0 ? (
                <p className="ak-empty-sm">
                  No keys listed from this wallet. <a href="#list-key">List one</a>.
                </p>
              ) : (
                <div className="ak-earn-table-wrap">
                  <table className="ak-earn-table">
                    <thead>
                      <tr>
                        <th>Listing</th>
                        <th>Calls</th>
                        <th>Credits billed</th>
                        <th>Your share</th>
                        <th>Claimed</th>
                        <th>Claimable</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {myClaimable.rows.map((row) => (
                        <tr key={row.listing.id}>
                          <td>
                            <strong>{row.listing.title}</strong>
                            <div className="ak-td-sub">{row.listing.keyMasked}</div>
                          </td>
                          <td>{row.calls}</td>
                          <td>{formatCredits(row.credits)}</td>
                          <td>{formatEthShort(row.listerEth)} {copy.asset}</td>
                          <td>{formatEthShort(row.claimedEth)} {copy.asset}</td>
                          <td>
                            <strong>{formatEthShort(row.claimable)} {copy.asset}</strong>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ak-solid-btn"
                              disabled={busy || row.claimable <= 0}
                              onClick={() => onClaim(row.listing.id)}
                            >
                              {busy && activeId === row.listing.id ? 'Claiming…' : 'Claim'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ak-section">
              <h2>Keys you are renting</h2>
              {myRentals.length === 0 ? (
                <p className="ak-empty-sm">
                  No active rentals. <a href="#api-market">Browse the market</a>.
                </p>
              ) : (
                <ul className="ak-mine-list">
                  {myRentals.map((r) => (
                    <li key={r.id}>
                      <div>
                        <strong>{r.listingId}</strong>
                        <span>
                          {formatCredits(r.creditsRemaining)} / {formatCredits(r.creditsTotal)}{' '}
                          credits · deposited {formatEthShort(r.ethDeposited)} {copy.asset}
                        </span>
                      </div>
                      <a className="ak-ghost-btn" href="#api-market">
                        Use
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ak-section">
              <h2>Claim history</h2>
              {claims.filter((c) => c.owner?.toLowerCase() === address?.toLowerCase()).length ===
              0 ? (
                <p className="ak-empty-sm">No claims yet.</p>
              ) : (
                <ul className="ak-mine-list">
                  {claims
                    .filter((c) => c.owner?.toLowerCase() === address?.toLowerCase())
                    .map((c) => (
                      <li key={c.id}>
                        <div>
                          <strong>{formatEthShort(c.ethAmount)} {copy.asset}</strong>
                          <span>
                            {new Date(c.createdAt).toLocaleString()} · {shortId(c.txHash)}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
