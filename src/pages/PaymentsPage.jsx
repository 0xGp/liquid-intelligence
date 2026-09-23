import React, { useMemo, useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useMarketplace } from '../context/MarketplaceContext'
import { formatCredits, formatEthShort } from '../web3/apiKeyMarket'
import { explorerTx, shortId } from '../web3/agents'
import { DEPOSIT_CHAIN } from '../web3/tokens'
import { PAYMENT_KINDS } from '../web3/paymentLedger'
import { useWalletPayments } from '../web3/useWalletPayments'
import { useChain } from '../chain/ChainContext'
import { useNearWallet } from '../near/NearWalletContext'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'out', label: 'Paid' },
  { id: 'in', label: 'Earned' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'spends', label: 'Spends' },
]

function matchesFilter(row, filter) {
  const dir = PAYMENT_KINDS[row.kind]?.direction
  if (filter === 'all') return true
  if (filter === 'out') return dir === 'out'
  if (filter === 'in') return dir === 'in'
  if (filter === 'deposits') return row.kind === 'ledger_deposit' || row.kind === 'key_rent'
  if (filter === 'spends') return row.kind === 'ledger_spend' || row.kind === 'key_usage'
  return true
}

export default function PaymentsPage() {
  const { openConnectModal } = useConnectModal()
  const { copy, isNear } = useChain()
  const near = useNearWallet()
  const { openDepositFrom, ledgerConfigured } = useMarketplace()
  const { address, isConnected, rows, analytics, syncing, syncError, refreshChain } =
    useWalletPayments()
  const [filter, setFilter] = useState('all')

  const visible = useMemo(
    () => rows.filter((row) => matchesFilter(row, filter)),
    [rows, filter]
  )

  const goBack = () => {
    window.location.hash = '#'
  }

  return (
    <div className="ak-page pay-page">
      <button type="button" className="mp-back" onClick={goBack} aria-label="Back">
        ←
      </button>
      <header className="ak-bar">
        <div className="ak-bar-title">
          <h1>Payments</h1>
          <p>
            {copy.paymentsLead}
          </p>
        </div>
        <div className="ak-bar-actions">
          <a className="ak-ghost-btn" href="#earnings">
            Key earnings
          </a>
          <button
            type="button"
            className="ak-solid-btn"
            onClick={(e) => openDepositFrom(e.currentTarget)}
          >
            {copy.deposit}
          </button>
        </div>
      </header>

      <div className="ak-flow">
        {!isConnected ? (
          <div className="ak-connect-card">
            <p>{copy.paymentsConnect}</p>
            <button type="button" className="ak-solid-btn" onClick={() => (isNear ? near.connect() : openConnectModal?.())}>
              Connect wallet
            </button>
          </div>
        ) : (
          <>
            <div className="pay-statement">
              <div>
                <p className="ak-earn-label">Paid out</p>
                <p className="ak-earn-value">{formatEthShort(analytics.paidEth)} {copy.asset}</p>
              </div>
              <div>
                <p className="ak-earn-label">Deposited</p>
                <p className="ak-earn-sub">{formatEthShort(analytics.depositEth)} {copy.asset}</p>
              </div>
              <div>
                <p className="ak-earn-label">Credits spent</p>
                <p className="ak-earn-sub">{formatCredits(analytics.spendCredits)}</p>
              </div>
              <div>
                <p className="ak-earn-label">Claimed / claimable</p>
                <p className="ak-earn-sub">
                  {formatEthShort(analytics.earnedEth)} / {formatEthShort(analytics.claimable)} {copy.asset}
                </p>
              </div>
            </div>

            <div className="ak-status-strip">
              <p className="ak-td-sub">
                {shortId(address)}
                {ledgerConfigured ? ' · ledger live' : ' · ledger not configured'}
                {syncing ? ' · syncing chain…' : ` · ${analytics.count} records`}
              </p>
              {syncError && <p className="ak-status-err">{syncError}</p>}
              <button
                type="button"
                className="ak-ghost-btn"
                onClick={refreshChain}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : 'Refresh chain'}
              </button>
            </div>

            <section className="ak-section">
              <h2>Volume, last 14 days</h2>
              {analytics.maxDay <= 0 ? (
                <p className="ak-empty-sm">No outbound {copy.asset} in this window.</p>
              ) : (
                <div className="pay-volume" role="img" aria-label={`${copy.asset} paid over the last 14 days`}>
                  {analytics.days.map((day) => {
                    return (
                      <div key={day.key} className="pay-volume-col">
                        <div className="pay-volume-track">
                          <div
                            className="pay-volume-fill"
                            style={{
                              '--fill': analytics.maxDay > 0 ? day.eth / analytics.maxDay : 0,
                            }}
                            title={`${day.label}: ${formatEthShort(day.eth)} ${copy.asset} · ${day.count} payments`}
                          />
                        </div>
                        <span>{day.label.replace(/^[A-Za-z]+ /, '')}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="ak-section">
              <h2>Breakdown</h2>
              <div className="ak-earn-table-wrap">
                <table className="ak-earn-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Count</th>
                      <th>{copy.asset}</th>
                      <th>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PAYMENT_KINDS).map(([kind, meta]) => {
                      const row = analytics.byKind[kind]
                      return (
                        <tr key={kind}>
                          <td>
                            <strong>{meta.label}</strong>
                            <div className="ak-td-sub">{meta.direction === 'out' ? 'Paid' : 'Received'}</div>
                          </td>
                          <td>{row.count}</td>
                          <td>{formatEthShort(row.eth)}</td>
                          <td>{formatCredits(row.credits)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="ak-section">
              <div className="pay-ledger-head">
                <h2>Ledger</h2>
                <div className="pay-filters" role="tablist" aria-label="Filter payments">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      aria-selected={filter === f.id}
                      className={filter === f.id ? 'is-active' : ''}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {visible.length === 0 ? (
                <p className="ak-empty-sm">
                  No payments in this view yet.{' '}
                  <button type="button" className="pay-inline-link" onClick={(e) => openDepositFrom(e.currentTarget)}>
                    {copy.deposit}
                  </button>{' '}
                  or <a href="#api-market">rent a key</a>.
                </p>
              ) : (
                <div className="ak-earn-table-wrap">
                  <table className="ak-earn-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Type</th>
                        <th>Detail</th>
                        <th>{copy.asset}</th>
                        <th>Credits</th>
                        <th>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => {
                        const meta = PAYMENT_KINDS[row.kind] || {
                          label: row.kind,
                          direction: 'out',
                        }
                        const url = explorerTx(DEPOSIT_CHAIN, row.txHash)
                        return (
                          <tr key={paymentRowKey(row)}>
                            <td>
                              {row.createdAt
                                ? new Date(row.createdAt).toLocaleString()
                                : '—'}
                            </td>
                            <td>
                              <span className={`pay-dir pay-dir-${meta.direction}`}>
                                {meta.direction === 'in' ? 'In' : 'Out'}
                              </span>{' '}
                              {meta.label}
                            </td>
                            <td>
                              {row.title || '—'}
                              {row.listingId ? (
                                <div className="ak-td-sub">{row.listingId}</div>
                              ) : null}
                            </td>
                            <td>
                              {meta.direction === 'in' ? '+' : '−'}
                              {formatEthShort(row.eth)}
                            </td>
                            <td>{formatCredits(row.credits)}</td>
                            <td>
                              {url ? (
                                <a href={url} target="_blank" rel="noreferrer" className="ak-tx-link">
                                  {shortId(row.txHash)}
                                </a>
                              ) : (
                                shortId(row.txHash)
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function paymentRowKey(row) {
  return row.txHash ? `${row.kind}-${row.txHash}` : row.id
}
