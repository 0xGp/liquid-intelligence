import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Web3Providers from './web3/providers.jsx'
import { ChainProvider } from './chain/ChainContext'
import { NearWalletProvider } from './near/NearWalletContext'
import './styles/tailwind.css'
import './styles/tokens.css'
import './index.css'
import './styles/payrent-ui.css'

createRoot(document.getElementById('root')).render(
  <ChainProvider>
    <Web3Providers>
      <NearWalletProvider>
        <App />
      </NearWalletProvider>
    </Web3Providers>
  </ChainProvider>,
)
