const NETWORK = import.meta.env.VITE_NEAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'

export const NEAR_NETWORK = NETWORK
export const NEAR_CONTRACT_ID = import.meta.env.VITE_NEAR_CONTRACT_ID || ''
export const NEAR_RPC =
  NETWORK === 'mainnet' ? 'https://rpc.mainnet.near.org' : 'https://rpc.testnet.near.org'

const YOCTO = 10n ** 24n
export const CREDITS_PER_NEAR = 5000
/** Credited portion, after a new account has paid for its own storage. */
export const MIN_DEPOSIT_NEAR = 0.001
/** Minimum to attach so a 64-character account can pay storage and still credit 0.001 NEAR. */
export const MIN_ATTACHED_NEAR = 0.003
export const NEAR_GAS = '30000000000000'

export function nearToYocto(amount) {
  const raw = String(amount).trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Enter a NEAR amount.')
  const [whole, frac = ''] = raw.split('.')
  const fracPadded = `${frac}000000000000000000000000`.slice(0, 24)
  return BigInt(whole) * YOCTO + BigInt(fracPadded)
}

export function yoctoToNear(yocto) {
  const value = BigInt(yocto || 0)
  const whole = value / YOCTO
  const frac = (value % YOCTO).toString().padStart(24, '0').slice(0, 6)
  return Number(`${whole}.${frac}`)
}

export function nearExplorerTx(hash) {
  if (!hash) return null
  const host = NETWORK === 'mainnet' ? 'https://explorer.near.org' : 'https://explorer.testnet.near.org'
  return `${host}/transactions/${hash}`
}

async function rpc(method, params) {
  const response = await fetch(NEAR_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'liquid', method, params }),
  })
  const json = await response.json()
  if (json.error) {
    throw new Error(json.error?.data || json.error?.message || 'NEAR RPC failed')
  }
  return json.result
}

export async function viewFunction(methodName, args) {
  if (!NEAR_CONTRACT_ID) throw new Error('Set VITE_NEAR_CONTRACT_ID.')
  const result = await rpc('query', {
    request_type: 'call_function',
    finality: 'final',
    account_id: NEAR_CONTRACT_ID,
    method_name: methodName,
    args_base64: btoa(JSON.stringify(args ?? {})),
  })
  const text = new TextDecoder().decode(Uint8Array.from(result.result))
  return JSON.parse(text)
}

export async function viewNativeYocto(accountId) {
  if (!accountId) return null
  const account = await rpc('query', {
    request_type: 'view_account',
    finality: 'final',
    account_id: accountId,
  })
  return account.amount || '0'
}
