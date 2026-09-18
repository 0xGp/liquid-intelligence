import React, { useState, useEffect } from 'react'
import Cursor from './components/Cursor'
import AppNav from './components/navigation/AppNav'
import DepositModal from './components/DepositModal'

import LandingPage from './pages/LandingPage'
import MarketplacePage from './pages/MarketplacePage'
import ApiMarketPage from './pages/ApiMarketPage'
import ListKeyPage from './pages/ListKeyPage'
import EarningsPage from './pages/EarningsPage'
import PaymentsPage from './pages/PaymentsPage'

import { MarketplaceProvider } from './context/MarketplaceContext'
import { ApiKeyMarketProvider } from './web3/ApiKeyMarketContext'
import { CreditLedgerProvider } from './web3/CreditLedgerContext'
import { useMotion } from './hooks/useMotion'
import Rail from './components/Rail'

import { useAccount } from 'wagmi'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return hash
}

function AppInner() {
  useMotion()
  const hash = useHash()
  const { isConnected } = useAccount()
  const prevConnected = React.useRef(isConnected)

  useEffect(() => {
    if (!prevConnected.current && isConnected) {
      if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#work') {
        window.location.hash = '#marketplace'
      }
    }
    prevConnected.current = isConnected
  }, [isConnected])

  const onRail = hash === '#rail'
  const onMarketplace = hash === '#marketplace'
  const onApiMarket = hash === '#api-market'
  const onListKey = hash === '#list-key'
  const onEarnings = hash === '#earnings'
  

  let page = <LandingPage />
  if (onRail) page = <Rail />
  else if (onMarketplace) page = <MarketplacePage />
  else if (onApiMarket) page = <ApiMarketPage />
  else if (onListKey) page = <ListKeyPage />
  else if (onEarnings) page = <EarningsPage />
 

  return (
    <>
      <a href="#main" className="sr-only-focus" style={{ position: 'absolute', left: '-9999px' }}>
        Skip to content
      </a>
      <Cursor />
      <AppNav />
      <DepositModal />
      {page}
    </>
  )
}

export default function App() {
  return (
    <CreditLedgerProvider>
      <MarketplaceProvider>
        <ApiKeyMarketProvider>
          <AppInner />
        </ApiKeyMarketProvider>
      </MarketplaceProvider>
    </CreditLedgerProvider>
  )
}
