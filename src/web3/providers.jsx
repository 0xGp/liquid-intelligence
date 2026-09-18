import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './config'
import { robinhood } from './chain'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const theme = lightTheme({
  accentColor: '#111318',
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
})

export default function Web3Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={theme}
          initialChain={robinhood}
          locale="en-US"
          appInfo={{ appName: 'Payrent' }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
