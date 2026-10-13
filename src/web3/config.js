import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { ethereum } from './chain'

export const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '21fef48091f12692cad574a6f7753643'

const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

/** Ethereum mainnet only. */
export const wagmiConfig = getDefaultConfig({
  appName: 'LatentX Intelligence',
  appDescription: 'AI infrastructure marketplace on Ethereum.',
  appUrl: appUrl || 'https://payrent.app',
  appIcon: `${appUrl}/assets/logo-square.png`,
  projectId: walletConnectProjectId,
  chains: [ethereum],
  transports: {
    [ethereum.id]: http(ethereum.rpcUrls.default.http[0]),
  },
  wallets: [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, coinbaseWallet, rainbowWallet, walletConnectWallet],
    },
    {
      groupName: 'Also supported',
      wallets: [injectedWallet],
    },
  ],
  ssr: false,
})
