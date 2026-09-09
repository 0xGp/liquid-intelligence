import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Web3Providers from './web3/providers.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <Web3Providers>
    <App />
  </Web3Providers>,
)
