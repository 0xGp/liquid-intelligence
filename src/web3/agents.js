import { getAddress, isAddress, keccak256, stringToHex } from 'viem'

function namedWallet(name) {
  return getAddress(`0x${keccak256(stringToHex(`vince.agent.${name}`)).slice(-40)}`)
}

function envAddress(key, fallback) {
  const value = import.meta.env[key]
  return value && isAddress(value) ? getAddress(value) : fallback
}

export const TASK_CAP_USD = 2

/** Symbolic on-chain payment: $1 of list price → 0.00001 ETH, plus gas. */
export function usdToWeiString(usd) {
  const eth = Math.max(0.000001, +(usd * 0.00001).toFixed(8))
  return eth.toString()
}

export const PROVIDERS = [
  {
    id: 'signal',
    name: 'Signal Mesh',
    skill: 'Market signal',
    price: 0.12,
    unit: 'query',
    address: envAddress('VITE_AGENT_SIGNAL', namedWallet('signal')),
    blurb: 'Live tape and cross-venue pressure for a ticker or pair.',
  },
  {
    id: 'field',
    name: 'Fieldwork',
    skill: 'Web research',
    price: 0.08,
    unit: 'call',
    address: envAddress('VITE_AGENT_FIELD', namedWallet('field')),
    blurb: 'A sourced brief on a company, protocol, or question.',
  },
  {
    id: 'north',
    name: 'Northbound',
    skill: 'Live data rows',
    price: 0.03,
    unit: 'row',
    address: envAddress('VITE_AGENT_NORTH', namedWallet('north')),
    blurb: 'Metered rows from a live table. You pay for what you pull.',
  },
]

export function shortId(value) {
  if (!value) return '—'
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export function explorerTx(chain, hash) {
  const base = chain?.blockExplorers?.default?.url
  if (!base || !hash) return null
  return `${base}/tx/${hash}`
}

export function runAgent(provider, prompt) {
  const q = (prompt || '').trim() || provider.skill
  if (provider.id === 'signal') {
    const name = q.toUpperCase().slice(0, 12)
    return {
      kind: 'signal',
      title: `${provider.name} · ${name}`,
      body: [
        `Bid/ask pressure on ${name} is two-sided. Offer-side size thinned after the last print.`,
        'Cross-venue lag is 40–90 ms. A paying agent would size against the thin side, not chase.',
        'Confidence 0.71. This is a rented signal, not advice.',
      ],
      ticks: [
        { k: 'Bias', v: 'Mild bid' },
        { k: 'Spread', v: '3.2 bps' },
        { k: 'Lag', v: '64 ms' },
      ],
    }
  }
  if (provider.id === 'north') {
    return {
      kind: 'rows',
      title: `${provider.name} · ${q}`,
      body: ['Metered extract. Each row was a billable unit on the rail.'],
      rows: [
        { ts: '19:02:11', src: 'tape', val: '1.0008', note: q },
        { ts: '19:02:11', src: 'depth', val: '0.42', note: 'bid size' },
        { ts: '19:02:12', src: 'depth', val: '0.19', note: 'ask size' },
        { ts: '19:02:12', src: 'flow', val: '+12', note: 'net prints' },
      ],
    }
  }
  return {
    kind: 'brief',
    title: `${provider.name} · ${q}`,
    body: [
      `Fieldwork ran a short pass on “${q}”.`,
      'Primary sources agree on the shape of the story; they disagree on timing and size.',
      'If you need a second pass, rent another call. Vince will hold, meter, and settle again.',
    ],
  }
}

export function isUserRejection(err) {
  const msg = `${err?.shortMessage || ''} ${err?.message || ''} ${err?.cause?.message || ''}`
  return err?.code === 4001 || /rejected|denied|cancelled|canceled/i.test(msg)
}
