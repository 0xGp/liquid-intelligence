/**
 * Robinhood wallet, chain tab, and key-market surfaces.
 * Set to true to show them again. The code stays either way.
 */
export const SHOW_ROBINHOOD = false

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
