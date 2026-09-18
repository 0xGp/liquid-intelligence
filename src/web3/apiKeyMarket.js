import { parseEther, formatEther } from 'viem'
import { CREDITS_PER_ETH, MIN_DEPOSIT_ETH } from './tokens'

/** Vince takes this share of metered usage; rest accrues to the key lister. */
export const PLATFORM_FEE_BPS = 1000 // 10%

export const KEY_PROVIDERS = [
  { id: 'openai', label: 'OpenAI', kinds: ['chat', 'video', 'image'] },
  { id: 'gemini', label: 'Google Gemini', kinds: ['chat', 'video'] },
  { id: 'opper', label: 'Opper', kinds: ['chat', 'video'] },
  { id: 'kling', label: 'Kling', kinds: ['video'] },
  { id: 'anthropic', label: 'Anthropic', kinds: ['chat'] },
  { id: 'other', label: 'Other', kinds: ['chat', 'video', 'image'] },
]

export const KIND_LABELS = {
  chat: 'Text / chat',
  video: 'Video generation',
  image: 'Image generation',
}

const STORAGE_LISTINGS = 'vince_api_listings_v1'
const STORAGE_RENTALS = 'vince_api_rentals_v1'
const STORAGE_USAGE = 'vince_api_usage_v1'
const STORAGE_CLAIMS = 'vince_api_claims_v1'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadListings() {
  return readJson(STORAGE_LISTINGS, [])
}

export function saveListings(list) {
  writeJson(STORAGE_LISTINGS, list)
}

export function loadRentals() {
  return readJson(STORAGE_RENTALS, [])
}

export function saveRentals(list) {
  writeJson(STORAGE_RENTALS, list)
}

export function loadUsage() {
  return readJson(STORAGE_USAGE, [])
}

export function saveUsage(list) {
  writeJson(STORAGE_USAGE, list)
}

export function loadClaims() {
  return readJson(STORAGE_CLAIMS, [])
}

export function saveClaims(list) {
  writeJson(STORAGE_CLAIMS, list)
}

/** Mask API key for display — never show full secret to renters. */
export function maskApiKey(key) {
  const k = String(key || '').trim()
  if (k.length < 10) return '••••••••'
  return `${k.slice(0, 6)}…${k.slice(-4)}`
}

export function creditsToEth(credits) {
  return Number(credits) / CREDITS_PER_ETH
}

export function ethToListingCredits(eth) {
  return +(Number(eth) * CREDITS_PER_ETH).toFixed(2)
}

export function splitUsageEth(ethAmount) {
  const total = Number(ethAmount)
  const platform = +((total * PLATFORM_FEE_BPS) / 10000).toFixed(8)
  const lister = +(total - platform).toFixed(8)
  return { platform, lister, total }
}

export function minRentEth() {
  return MIN_DEPOSIT_ETH
}

export function parseRentEth(amount) {
  return parseEther(String(amount))
}

export function formatEthShort(eth) {
  const n = Number(eth)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  if (n < 0.0001) return n.toExponential(2)
  return n.toFixed(6).replace(/\.?0+$/, '')
}

export function formatCredits(n) {
  return Number(n || 0).toFixed(2)
}

/** Seed demo listings once if empty (no real keys). */
export function ensureSeedListings() {
  const existing = loadListings()
  if (existing.length > 0) return existing
  const seed = [
    {
      id: 'lst_demo_openai',
      owner: '0xDemoOwner000000000000000000000000000001',
      provider: 'openai',
      kind: 'chat',
      title: 'OpenAI GPT pool',
      description: 'Shared gpt-4o-mini access for drafting and agents. Metered per message.',
      pricePerCallCredits: 0.03,
      status: 'active',
      createdAt: Date.now() - 86400000 * 3,
      keyMasked: 'sk-dem…x9k2',
      keyFingerprint: 'demo-openai',
      demo: true,
      totalCalls: 128,
      totalCreditsBilled: 3.84,
    },
    {
      id: 'lst_demo_kling',
      owner: '0xDemoOwner000000000000000000000000000002',
      provider: 'kling',
      kind: 'video',
      title: 'Kling 3.0 Pro lane',
      description: 'Video generation quota on Kling. Billed per render second equivalent.',
      pricePerCallCredits: 0.5,
      status: 'active',
      createdAt: Date.now() - 86400000,
      keyMasked: 'sk-klin…4e83',
      keyFingerprint: 'demo-kling',
      demo: true,
      totalCalls: 42,
      totalCreditsBilled: 21,
    },
  ]
  saveListings(seed)
  return seed
}

export { CREDITS_PER_ETH, formatEther }
