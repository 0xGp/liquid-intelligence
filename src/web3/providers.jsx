import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './config'
import { robinhood } from './chain'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const theme = darkTheme({
  accentColor: '#f7f6f3',
  accentColorForeground: '#0a0a0a',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
})

export default function Web3Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} initialChain={robinhood} locale="en-US" appInfo={{ appName: 'Vince' }}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
