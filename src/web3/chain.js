import { defineChain } from 'viem'
import { mainnet } from 'viem/chains'

const ETH_RPC = import.meta.env?.VITE_ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com'

export const ethereum = defineChain({
  ...mainnet,
  name: 'Ethereum',
  rpcUrls: {
    default: { http: [ETH_RPC] },
  },
})

export const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
})

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
  testnet: true,
})

export const VINCE_DOMAIN = {
  name: 'Vince',
  version: '1',
}

export const RENT_TYPES = {
  RentAuthorization: [
    { name: 'payer', type: 'address' },
    { name: 'specialist', type: 'address' },
    { name: 'skill', type: 'string' },
    { name: 'capUsd', type: 'string' },
    { name: 'maxWei', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}
