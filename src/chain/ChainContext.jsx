import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SHOW_ROBINHOOD } from './visibility'

const STORAGE_KEY = 'liq_chain'
const ChainContext = createContext(null)

function readChain() {
  if (!SHOW_ROBINHOOD) return 'near'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'near' ? 'near' : 'eth'
  } catch {
    return 'eth'
  }
}

const COPY = {
  eth: {
    id: 'eth',
    asset: 'ETH',
    network: 'Robinhood Chain',
    networkShort: 'Robinhood',
    connect: 'Connect Robinhood',
    connectHint: 'Connect Robinhood Wallet on Robinhood Chain mainnet.',
    deposit: 'Deposit ETH',
    walletAsset: 'Wallet ETH',
    settlementTitle: 'Robinhood ETH settlement',
    settlementBody: 'Deposits settle in native ETH on Robinhood Chain. Verifiable, fast, non-custodial.',
    hero: 'Generate AI. Rent API access. Pay only for what you use — settled in ETH on Robinhood mainnet.',
    about: 'Deposit ETH on Robinhood Chain, unlock video models and text LLMs, or rent listed API keys. Every call burns credits — listers earn when others use their keys. Raw secrets stay vault-encrypted; only ciphertext lives on-chain.',
    depositStep: 'Fund credits with Robinhood ETH.',
    keys: 'Rent listed keys with ETH. Ciphertext on-chain; decrypt only in the vault proxy.',
    payments: 'Deposits, spends, rents, and claims in one readable ledger on Robinhood.',
    footerTitle: 'Generate and rent on Robinhood.',
    footerBody: 'AI infrastructure marketplace with on-chain credits on Robinhood Chain.',
    footerMeta: '© 2026 Liquid Intelligence. Built on Robinhood Chain.',
    studio: 'Create with AI models. Every call is metered in credits and settled on Robinhood Chain.',
    bannerList: 'Publish a key for others to rent. Metered calls pay you on Robinhood Chain — secrets stay vault-encrypted.',
    bannerRent: 'Unlock vault-proxied API access with ETH. Pay per call, not a subscription.',
    bannerStudio: 'Video models and text LLMs share one credit pool. Every call is metered and settled in ETH.',
    apiMarket: 'Find API access for AI workloads. Rent with ETH — pay only for what you use.',
    paymentsLead: 'Every deposit, spend, key rent, and claim from this wallet on Robinhood Chain. Syncs on-chain events with local studio activity.',
    paymentsConnect: 'Connect Robinhood Wallet to open your payment ledger and analytics.',
    earningsLead: 'Usage fees from rented keys. Platform keeps the fee; claim the rest to your wallet on Robinhood Chain.',
    earningsConnect: 'Connect Robinhood Wallet to see listings you own and claimable fees.',
    listPrice: 'Set the credit cost per metered call. Renters deposit ETH; credits burn per call.',
    listDone: 'Renters can deposit ETH on the market page.',
    wrongNetwork: 'Switch to Robinhood',
    ledgerEnv: 'VITE_CREDIT_LEDGER_ADDRESS',
    minHint: 'ETH',
  },
  near: {
    id: 'near',
    asset: 'NEAR',
    network: 'NEAR testnet',
    networkShort: 'NEAR',
    connect: 'Connect NEAR',
    connectHint: 'Connect a NEAR wallet on testnet. Studio credits settle on the NEAR credit contract.',
    deposit: 'Deposit NEAR',
    walletAsset: 'Wallet NEAR',
    settlementTitle: 'NEAR settlement',
    settlementBody: 'Deposits settle in native NEAR on testnet. Verifiable, fast, non-custodial.',
    hero: 'Generate AI. Pay only for what you use — settled in NEAR on testnet.',
    about: 'Deposit NEAR on testnet, then unlock video models and text LLMs. Every call burns credits from one pool.',
    depositStep: 'Fund credits with NEAR.',
    keys: 'Rent listed keys with NEAR. Ciphertext on-chain; decrypt only in the vault proxy.',
    payments: 'Deposits, spends, rents, and claims in one readable ledger on NEAR.',
    footerTitle: 'Generate on NEAR.',
    footerBody: 'AI infrastructure marketplace with on-chain credits on NEAR testnet.',
    footerMeta: '© 2026 Liquid Intelligence. Built on NEAR testnet.',
    studio: 'Create with AI models. Every call is metered in credits and settled on NEAR testnet.',
    bannerList: 'Publish a key for others to rent. Metered calls pay you on NEAR — secrets stay vault-encrypted.',
    bannerRent: 'Unlock vault-proxied API access with NEAR. Pay per call, not a subscription.',
    bannerStudio: 'Video models and text LLMs share one credit pool. Every call is metered and settled in NEAR.',
    apiMarket: 'Find API access for AI workloads. Rent with NEAR — pay only for what you use.',
    paymentsLead: 'Studio deposits and spends from this NEAR wallet. Key rents and claims stay on Robinhood until a NEAR market is live.',
    paymentsConnect: 'Connect a NEAR wallet to open your payment ledger.',
    earningsLead: 'Key earnings still settle on Robinhood. Switch the chain tab to ETH to claim them.',
    earningsConnect: 'Connect a NEAR wallet, or switch to ETH to claim Robinhood key earnings.',
    listPrice: 'Set the credit cost per metered call. Key listings still settle on Robinhood — switch the chain tab to ETH to publish.',
    listDone: 'Renters can deposit on the market page.',
    wrongNetwork: 'NEAR testnet',
    ledgerEnv: 'VITE_NEAR_CONTRACT_ID',
    minHint: 'NEAR',
  },
}

export function ChainProvider({ children }) {
  const [chain, setChainState] = useState(readChain)

  useEffect(() => {
    if (!SHOW_ROBINHOOD) return
    try {
      localStorage.setItem(STORAGE_KEY, chain)
    } catch {
      /* ignore private mode */
    }
  }, [chain])

  const value = useMemo(
    () => ({
      chain,
      isNear: chain === 'near',
      copy: COPY[chain],
      setChain: (next) => {
        if (!SHOW_ROBINHOOD) return
        setChainState(next === 'near' ? 'near' : 'eth')
      },
    }),
    [chain],
  )

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>
}

export function useChain() {
  const ctx = useContext(ChainContext)
  if (!ctx) throw new Error('useChain must be used within ChainProvider')
  return ctx
}
