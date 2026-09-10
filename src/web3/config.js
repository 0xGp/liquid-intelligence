import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { robinhood, robinhoodTestnet } from './chain'
import { robinhoodWallet } from './wallets'

export const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '21fef48091f12692cad574a6f7753643'

const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

export const wagmiConfig = getDefaultConfig({
  appName: 'Vince',
  appDescription: 'A payment rail for AI agents on Robinhood Chain.',
  appUrl: appUrl || 'https://vince.app',
  appIcon: `${appUrl}/assets/logo-square.png`,
  projectId: walletConnectProjectId,
  chains: [robinhood, robinhoodTestnet],
  transports: {
    [robinhood.id]: http(robinhood.rpcUrls.default.http[0]),
    [robinhoodTestnet.id]: http(robinhoodTestnet.rpcUrls.default.http[0]),
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
