/**
 * ETH wallet and key-market surfaces.
 * Set to true to show them again. The code stays either way.
 */
export const SHOW_ROBINHOOD = true

/**
 * NEAR wallet, ledger, and the ETH|NEAR chain tab.
 * Off: the app runs on Ethereum mainnet only. The NEAR code stays.
 */
export const SHOW_NEAR = false

const HIDDEN_HASHES = new Set(['#api-market', '#list-key', '#earnings', '#payments', '#rail'])

export function robinhoodHidden(href) {
  if (SHOW_ROBINHOOD) return false
  const hash = String(href || '').split('?')[0]
  return HIDDEN_HASHES.has(hash)
}

export function withoutRobinhood(items) {
  if (SHOW_ROBINHOOD) return items
  return items.filter((item) => !robinhoodHidden(item.href))
}
