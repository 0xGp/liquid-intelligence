/** ABI for Vince CreditLedger (platform deposits / spend). */
export const creditLedgerAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'treasury_', type: 'address' }],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'spend',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'microCost', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'microCredits',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'CREDITS_PER_ETH',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'MICRO',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'MIN_DEPOSIT_WEI',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'treasury',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'ethIn', type: 'uint256', indexed: false },
      { name: 'microCreditsAdded', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Spent',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'microCreditsBurned', type: 'uint256', indexed: false },
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
