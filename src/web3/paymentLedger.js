const STORAGE = 'vince_payments_v1'
const EVENT = 'vince:payments'

export const PAYMENT_KINDS = {
  ledger_deposit: { label: 'Studio deposit', direction: 'out' },
  ledger_spend: { label: 'Studio spend', direction: 'out' },
  key_rent: { label: 'Key rent', direction: 'out' },
  key_usage: { label: 'Rented key use', direction: 'out' },
  claim: { label: 'Earnings claim', direction: 'in' },
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE, JSON.stringify(list.slice(0, 800)))
  try {
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    /* ignore */
  }
}

export function paymentKey(entry) {
  if (entry.txHash) return `${entry.kind}:${String(entry.txHash).toLowerCase()}`
  return entry.id
}

export function mergePaymentLists(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const entry of list || []) {
      if (!entry) continue
      const key = paymentKey(entry)
      const prev = map.get(key)
      if (!prev) {
        map.set(key, entry)
        continue
      }
      map.set(key, {
        ...prev,
        ...entry,
        createdAt: Math.min(prev.createdAt || Infinity, entry.createdAt || Infinity),
        eth: Number(entry.eth ?? prev.eth) || 0,
        credits: Number(entry.credits ?? prev.credits) || 0,
      })
    }
  }
  return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function loadPayments(wallet) {
  const all = readAll()
  if (!wallet) return all
  const lc = wallet.toLowerCase()
  return all.filter((p) => p.wallet?.toLowerCase() === lc)
}

export function recordPayment(entry) {
  if (!entry?.wallet || !entry.kind) return entry
  const next = mergePaymentLists(readAll(), [
    {
      id: entry.id || `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: entry.createdAt || Date.now(),
      eth: Number(entry.eth) || 0,
      credits: Number(entry.credits) || 0,
      ...entry,
    },
  ])
  writeAll(next)
  return entry
}

export function onPaymentsChange(handler) {
  const onStorage = (e) => {
    if (e.key === STORAGE) handler()
  }
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', onStorage)
  }
}
