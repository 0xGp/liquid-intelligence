import React, { createContext, useContext, useState } from 'react'
import modelsData from '../data/models.json'
import textModelsData from '../data/textModels.json'
import { useCreditLedger } from '../web3/CreditLedgerContext'

const MarketplaceContext = createContext(null)

export function MarketplaceProvider({ children }) {
  const {
    balance,
    pending: ledgerPending,
    configured: ledgerConfigured,
    depositEth,
    spendCredits,
    refreshBalance,
    ledgerAddress,
  } = useCreditLedger()

  const [models] = useState(modelsData)
  const [textModels] = useState(textModelsData)
  const [marketplaceTab, setMarketplaceTab] = useState('video') // 'video' | 'text'

  const [isDepositPending, setIsDepositPending] = useState(false)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState('opper-video')
  const [selectedTextModelId, setSelectedTextModelId] = useState('opper-gpt-5-mini')

  const [jobState, setJobState] = useState('idle')
  const [jobProgress, setJobProgress] = useState(0)
  const [jobResult, setJobResult] = useState(null)
  const [jobError, setJobError] = useState(null)
  const [jobQueuePos, setJobQueuePos] = useState(null)
  const [lastDeduction, setLastDeduction] = useState(0)
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)
  const [studioOrigin, setStudioOrigin] = useState(null)
  const [depositOrigin, setDepositOrigin] = useState(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  /** Chat threads keyed by text model id */
  const [chatByModel, setChatByModel] = useState({})

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0]
  const selectedTextModel =
    textModels.find((m) => m.id === selectedTextModelId) || textModels[0]

  const chatMessages = chatByModel[selectedTextModelId] || []

  const setChatMessages = (updater) => {
    setChatByModel((prev) => {
      const current = prev[selectedTextModelId] || []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [selectedTextModelId]: next }
    })
  }

  const clearChat = () => {
    setChatByModel((prev) => ({ ...prev, [selectedTextModelId]: [] }))
  }

  const switchTab = (tab) => {
    setMarketplaceTab(tab)
    setPromptDrawerOpen(false)
    setStudioOrigin(null)
    setJobState('idle')
    setJobResult(null)
    setJobError(null)
  }

  const openStudioFrom = (el) => {
    if (el?.getBoundingClientRect) {
      const r = el.getBoundingClientRect()
      setStudioOrigin({ x: r.left, y: r.top, w: r.width, h: r.height })
    } else {
      setStudioOrigin(null)
    }
    setPromptDrawerOpen(true)
  }

  const openDepositFrom = (el) => {
    if (el?.getBoundingClientRect) {
      const r = el.getBoundingClientRect()
      setDepositOrigin({ x: r.left, y: r.top, w: r.width, h: r.height })
    } else {
      setDepositOrigin(null)
    }
    setDepositModalOpen(true)
  }

  /**
   * Charge on-chain credits (wallet confirm), then record last deduction.
   * Returns spend tx result or throws.
   */
  const chargeCredits = async (amount) => {
    const result = await spendCredits(amount)
    setLastDeduction(Number(amount))
    return result
  }

  return (
    <MarketplaceContext.Provider
      value={{
        models,
        textModels,
        marketplaceTab,
        setMarketplaceTab: switchTab,
        balance,
        /** @deprecated balance is on-chain; prefer chargeCredits / depositEth */
        setBalance: () => {},
        isDepositPending: isDepositPending || ledgerPending,
        setIsDepositPending,
        depositModalOpen,
        setDepositModalOpen,
        depositOrigin,
        openDepositFrom,
        connectModalOpen,
        setConnectModalOpen,
        selectedModelId,
        setSelectedModelId,
        selectedModel,
        selectedTextModelId,
        setSelectedTextModelId,
        selectedTextModel,
        chatMessages,
        setChatMessages,
        clearChat,
        jobState,
        setJobState,
        jobProgress,
        setJobProgress,
        jobResult,
        setJobResult,
        jobError,
        setJobError,
        jobQueuePos,
        setJobQueuePos,
        lastDeduction,
        setLastDeduction,
        promptDrawerOpen,
        setPromptDrawerOpen,
        studioOrigin,
        setStudioOrigin,
        openStudioFrom,
        videoModalOpen,
        setVideoModalOpen,
        ledgerConfigured,
        ledgerAddress,
        depositEth,
        spendCredits,
        chargeCredits,
        refreshBalance,
        depositCredits: () => {},
        depositCreditsSimulated: () => {},
        setZeroBalance: () => {},
        resetBalance: () => {},
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  )
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext)
  if (!ctx) {
    throw new Error('useMarketplace must be used within MarketplaceProvider')
  }
  return ctx
}
