import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const root = join(__dirname, '..')

export const NETWORKS = {
  mainnet: {
    id: 4663,
    name: 'Robinhood Chain',
    slug: 'robinhood-mainnet',
    envNetwork: 'mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
    },
  },
  testnet: {
    id: 46630,
    name: 'Robinhood Testnet',
    slug: 'robinhood-testnet',
    envNetwork: 'testnet',
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

export function resolveNetwork() {
  const raw = (
    process.env.DEPLOY_NETWORK ||
    process.env.VITE_DEPOSIT_NETWORK ||
    'mainnet'
  )
    .trim()
    .toLowerCase()
  const key = raw === 'testnet' ? 'testnet' : 'mainnet'
  return NETWORKS[key]
}
