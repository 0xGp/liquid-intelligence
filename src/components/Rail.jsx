import { useEffect, useRef, useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseEther, stringToHex, isAddress, getAddress } from 'viem'
import { useAccount, useBalance, useSendTransaction, useSignTypedData, useSwitchChain } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import WalletButton from './WalletButton'
import AgentUse from './AgentUse'
import { ethereum, VINCE_DOMAIN, RENT_TYPES } from '../web3/chain'
import { wagmiConfig } from '../web3/config'
import {
  PROVIDERS,
  TASK_CAP_USD,
  explorerTx,
  isUserRejection,
  runAgent,
  shortId,
  usdToWeiString,
} from '../web3/agents'

const STEPS = [
  { id: 'auth', label: 'Authorize', hint: 'Sign with your wallet id' },
  { id: 'hold', label: 'Hold', hint: 'Pay on Ethereum' },
  { id: 'work', label: 'Work', hint: 'Receiving agent runs' },
  { id: 'meter', label: 'Meter', hint: 'Actual units used' },
  { id: 'settle', label: 'Settle', hint: 'Receipt + tx hash' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function money(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function payTo(provider, payer) {
  const treasury = import.meta.env.VITE_VINCE_TREASURY
  if (treasury && isAddress(treasury)) return getAddress(treasury)
  // Demo escrow: hold returns to the payer so you only spend gas until a treasury is set.
  return payer || provider?.address
}

export default function Rail() {
  const { address, isConnected, chain, chainId } = useAccount()
  const { data: balance } = useBalance({ address, chainId: chain?.id })
  const { openConnectModal } = useConnectModal()
  const { signTypedDataAsync } = useSignTypedData()
  const { sendTransactionAsync } = useSendTransaction()
  const { switchChainAsync } = useSwitchChain()

  const [selected, setSelected] = useState(PROVIDERS[0].id)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('idle')
  const [status, setStatus] = useState('Connect a wallet. Sign the rent. Pay the call. Use the agent.')
  const [receipts, setReceipts] = useState([])
  const [session, setSession] = useState(null)
  const runId = useRef(0)

  const provider = PROVIDERS.find((p) => p.id === selected)
  const onEthereum = chainId === ethereum.id
  const payEth = provider ? usdToWeiString(provider.price) : '0'
  const destination = address ? payTo(provider, address) : provider?.address

  useEffect(() => {
    document.body.classList.add('rail-mode')
    return () => document.body.classList.remove('rail-mode')
  }, [])

  const rent = async () => {
    if (busy || !provider) return
    if (!isConnected || !address) {
      openConnectModal?.()
      setStatus('Connect an Ethereum wallet to rent.')
      return
    }

    const id = ++runId.current
    setBusy(true)
    setSession(null)

    try {
      const network = ethereum
      if (chainId !== ethereum.id) {
        setStep('auth')
        setStatus('Switching to Ethereum…')
        await switchChainAsync({ chainId: ethereum.id })
      }

      const units = provider.id === 'north' ? 12 + Math.floor(Math.random() * 8) : 1 + Math.floor(Math.random() * 3)
      const estimate = +(provider.price * Math.max(units, 1)).toFixed(2)
      if (estimate > TASK_CAP_USD) {
        setStep('denied')
        setStatus(`Denied. Estimate $${money(estimate)} exceeds the $${money(TASK_CAP_USD)} task cap.`)
        return
      }

      const value = parseEther(usdToWeiString(estimate))
      const nonce = BigInt(Date.now())
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60)
      const to = payTo(provider, address)

      setStep('auth')
      setStatus(`Sign the rent. Wallet id ${shortId(address)} authorizes ${provider.name}.`)

      const signature = await signTypedDataAsync({
        domain: { ...VINCE_DOMAIN, chainId: network.id },
        types: RENT_TYPES,
        primaryType: 'RentAuthorization',
        message: {
          payer: address,
          specialist: provider.address,
          skill: provider.skill,
          capUsd: money(TASK_CAP_USD),
          maxWei: value,
          nonce,
          deadline,
        },
      })
      if (id !== runId.current) return

      setStep('hold')
      setStatus(`Sending ${usdToWeiString(estimate)} ETH on Ethereum to hold the call.`)

      const hash = await sendTransactionAsync({
        to,
        value,
        data: stringToHex(`VINCE RENT ${provider.id} ${units}`),
        chainId: network.id,
      })
      if (id !== runId.current) return

      setStatus(`Held in tx ${shortId(hash)}. Waiting for Ethereum…`)
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: network.id })
      if (id !== runId.current) return

      setStep('work')
      setStatus(`${provider.name} is doing the rented work (${units} ${provider.unit}${units > 1 ? 's' : ''}).`)
      await sleep(600)
      if (id !== runId.current) return

      const used = Math.max(1, units - Math.floor(Math.random() * 2))
      const actual = +Math.min(TASK_CAP_USD, provider.price * used).toFixed(2)

      setStep('meter')
      setStatus(`Metered ${used} ${provider.unit}${used > 1 ? 's' : ''} × $${money(provider.price)} = $${money(actual)}.`)
      await sleep(400)
      if (id !== runId.current) return

      setStep('settle')
      const txUrl = explorerTx(network, hash)
      const receipt = {
        id: `rcpt_${Date.now().toString(36)}`,
        to: provider.name,
        units: used,
        unit: provider.unit,
        amount: actual,
        eth: usdToWeiString(estimate),
        hash,
        signature,
        txUrl,
      }
      setReceipts((list) => [receipt, ...list].slice(0, 8))
      setSession({
        providerId: provider.id,
        remaining: used,
        result: null,
        txUrl,
        signature,
        hash,
      })
      setStatus(`Settled on Ethereum. ${provider.name} is yours to use.`)
      setStep('done')
    } catch (err) {
      const detail = `${err?.shortMessage || ''} ${err?.message || ''}`
      setStep('denied')
      if (isUserRejection(err)) {
        setStatus('Cancelled in wallet. Nothing was paid.')
      } else if (/insufficient|exceeds allowance|exceeds the balance/i.test(detail)) {
        setStatus('Not enough ETH on Ethereum for this hold. Add a little ETH, then rent again.')
      } else {
        setStatus(err?.shortMessage || err?.message || 'The rail could not complete this rent.')
      }
    } finally {
      if (id === runId.current) setBusy(false)
    }
  }

  const ask = async (prompt) => {
    if (!session || session.remaining <= 0 || session.providerId !== provider.id) return
    setBusy(true)
    setStep('work')
    setStatus(`${provider.name} is answering from the paid hold.`)
    await sleep(500)
    const result = runAgent(provider, prompt)
    setSession((s) => ({
      ...s,
      remaining: Math.max(0, (s?.remaining || 1) - (provider.id === 'north' ? 4 : 1)),
      result,
    }))
    setStep('done')
    setStatus('Answered. Remaining units stay on this hold until you rent again.')
    setBusy(false)
  }

  return (
    <section className="rail">
      <div className="rail-head">
        <p className="rail-kicker">Ethereum · RainbowKit</p>
        <h1>Rent an agent. Pay on-chain.</h1>
        <p className="rail-lede">
          Connect an Ethereum wallet. Vince uses that wallet id, asks you to sign the rent, then sends a small ETH
          payment on Ethereum mainnet. After the tx lands, you use the agent.
        </p>
      </div>

      <div className="rail-grid">
        <article className="rail-card">
          <div className="rail-card-label">Paying agent</div>
          <h2>{isConnected ? 'Your wallet' : 'Not connected'}</h2>
          <p className="rail-meta">
            {isConnected ? `Wallet id ${shortId(address)}` : 'Connect a wallet to get a wallet id'}
          </p>
          <div className="rail-wallet-slot">
            <WalletButton />
          </div>
          <div className="rail-balance">
            <span>{onEthereum ? 'ETH on this chain' : 'Balance'}</span>
            <strong>{balance ? `${Number(balance.formatted).toPrecision(4)} ${balance.symbol}` : '—'}</strong>
          </div>
          <div className="rail-policy">
            <div>
              <span>Task cap</span>
              <b>${money(TASK_CAP_USD)}</b>
            </div>
            <div>
              <span>Network</span>
              <b>{chain?.name || 'Ethereum'}</b>
            </div>
          </div>
        </article>

        <article className="rail-card rail-card-wide">
          <div className="rail-card-label">Specialists for rent</div>
          <ul className="rail-list">
            {PROVIDERS.map((p) => (
              <li key={p.id}>
                <button
                  className={selected === p.id ? 'is-on' : ''}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelected(p.id)}
                >
                  <span>
                    <b>{p.name}</b>
                    <i>
                      {p.skill} · {shortId(p.address)}
                    </i>
                  </span>
                  <span className="rail-price">
                    ${money(p.price)}
                    <small>/{p.unit}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="rail-payhint">
            This rent signs with your wallet id, then sends about {payEth} ETH on Ethereum
            {destination ? ` to ${shortId(destination)}` : ''}. Without a treasury env, the hold
            returns to you so you only spend gas.
          </p>
          <button className="rail-go" type="button" disabled={busy} onClick={rent}>
            {busy
              ? 'On the wire…'
              : isConnected
                ? `Rent ${provider.name}`
                : 'Connect to rent'}
          </button>
        </article>

        <article className="rail-card">
          <div className="rail-card-label">Vince rail</div>
          <ol className="rail-steps">
            {STEPS.map((s) => (
              <li key={s.id} className={step === s.id || (step === 'done' && s.id === 'settle') ? 'is-live' : ''}>
                <b>{s.label}</b>
                <span>{s.hint}</span>
              </li>
            ))}
          </ol>
          <p className={`rail-status${step === 'denied' ? ' is-bad' : ''}`}>{status}</p>
        </article>
      </div>

      <AgentUse
        session={session && session.providerId === provider.id ? session : null}
        provider={provider}
        onAsk={ask}
        busy={busy}
      />

      <div className="rail-log">
        <div className="rail-card-label">Audit trail</div>
        {receipts.length === 0 ? (
          <p className="rail-empty">No receipts yet. A signed, paid call writes a line here.</p>
        ) : (
          <ul>
            {receipts.map((r) => (
              <li key={r.id}>
                <code>{shortId(r.hash)}</code>
                <span>
                  {shortId(address)} → {r.to} · {r.units} {r.unit}
                  {r.units > 1 ? 's' : ''}
                </span>
                <b>
                  ${money(r.amount)}
                  <small> / {r.eth} ETH</small>
                </b>
                {r.txUrl ? (
                  <a href={r.txUrl} target="_blank" rel="noreferrer">
                    tx
                  </a>
                ) : (
                  <small>signed</small>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
