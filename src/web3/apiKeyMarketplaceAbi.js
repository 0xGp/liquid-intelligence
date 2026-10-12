/** Minimal ABI for Vince ApiKeyMarketplace (Ethereum mainnet). */
export const apiKeyMarketplaceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'treasury_', type: 'address' },
      { name: 'operator_', type: 'address' },
      { name: 'platformFeeBps_', type: 'uint16' },
    ],
  },
  {
    type: 'function',
    name: 'createListing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'provider', type: 'string' },
      { name: 'kind', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'priceMicroCredits', type: 'uint256' },
      { name: 'ciphertext', type: 'bytes' },
    ],
    outputs: [{ name: 'listingId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setListingActive',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'meterUsage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'renter', type: 'address' },
      { name: 'microCost', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getCiphertext',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes' }],
  },
  {
    type: 'function',
    name: 'getListing',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [
      { name: 'lister', type: 'address' },
      { name: 'provider', type: 'string' },
      { name: 'kind', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'priceMicroCredits', type: 'uint256' },
      { name: 'ciphertextHash', type: 'bytes32' },
      { name: 'active', type: 'bool' },
      { name: 'totalCalls', type: 'uint256' },
      { name: 'totalMicroBilled', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'microCredits',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimableWei',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextListingId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'platformFeeBps',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    type: 'event',
    name: 'ListingCreated',
    inputs: [
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'lister', type: 'address', indexed: true },
      { name: 'provider', type: 'string', indexed: false },
      { name: 'kind', type: 'string', indexed: false },
      { name: 'priceMicroCredits', type: 'uint256', indexed: false },
      { name: 'ciphertextHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'renter', type: 'address', indexed: true },
      { name: 'ethIn', type: 'uint256', indexed: false },
      { name: 'microCreditsAdded', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'UsageMetered',
    inputs: [
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'renter', type: 'address', indexed: true },
      { name: 'microCreditsBurned', type: 'uint256', indexed: false },
      { name: 'listerWei', type: 'uint256', indexed: false },
      { name: 'platformWei', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Claimed',
    inputs: [
      { name: 'listingId', type: 'uint256', indexed: true },
      { name: 'lister', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
]

export const MICRO_CREDITS = 1_000_000n

export function creditsToMicro(credits) {
  return BigInt(Math.round(Number(credits) * Number(MICRO_CREDITS)))
}

export function microToCredits(micro) {
  return Number(micro) / Number(MICRO_CREDITS)
}

/** Deployed marketplace on Ethereum mainnet (set after deploy). */
export function marketplaceAddress() {
  const a = import.meta.env.VITE_API_KEY_MARKET_ADDRESS
  return a && a.startsWith('0x') ? a : null
}
