import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { robinhood } from './chain'
import { robinhoodWallet } from './wallets'

export const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '21fef48091f12692cad574a6f7753643'

const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

/** Robinhood mainnet only — no testnet in the wallet connector. */
export const wagmiConfig = getDefaultConfig({
  appName: 'Payrent',
  appDescription: 'AI infrastructure marketplace on Robinhood Chain.',
  appUrl: appUrl || 'https://payrent.app',
  appIcon: `${appUrl}/assets/logo-square.png`,
  projectId: walletConnectProjectId,
  chains: [robinhood],
  transports: {
    [robinhood.id]: http(robinhood.rpcUrls.default.http[0]),
  },
  wallets: [
    {
      groupName: 'Robinhood',
      wallets: [robinhoodWallet, walletConnectWallet],
    },
    {
      groupName: 'Also supported',
      wallets: [injectedWallet, metaMaskWallet, rainbowWallet],
    },
  ],
  ssr: false,
})
