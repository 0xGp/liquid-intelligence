import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const root = join(__dirname, '..')

export const NETWORKS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    slug: 'ethereum-mainnet',
    envNetwork: 'ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://ethereum-rpc.publicnode.com'] },
    },
  },
  robinhood: {
    id: 4663,
    name: 'Robinhood Chain',
    slug: 'robinhood-mainnet',
    envNetwork: 'robinhood',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
    },
  },
  'robinhood-testnet': {
    id: 46630,
    name: 'Robinhood Testnet',
    slug: 'robinhood-testnet',
    envNetwork: 'robinhood-testnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
    },
    testnet: true,
  },
}

export function loadEnvFile() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = val
    }
  }
}

/** DEPLOY_NETWORK=ethereum (default) | robinhood | robinhood-testnet */
export function resolveNetwork() {
  const raw = (process.env.DEPLOY_NETWORK || 'ethereum').trim().toLowerCase()
  const network = NETWORKS[raw]
  if (!network) {
    throw new Error(`Unknown DEPLOY_NETWORK "${raw}". Use one of: ${Object.keys(NETWORKS).join(', ')}`)
  }
  const rpc = raw === 'ethereum' && (process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL)
  return rpc ? { ...network, rpcUrls: { default: { http: [rpc] } } } : network
}
