import React, { useEffect, useId, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useMarketplace } from '../context/MarketplaceContext'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import {
  vaultProxy,
  chatPathForProvider,
  defaultChatModelForProvider,
} from '../web3/vaultProxy'

/**
 * Text chat via Opper Conversations (OpenAI-compatible gateway),
 * or via a rented marketplace key (vault proxy — key never in browser).
 * https://docs.opper.ai/build/gateway/conversations
 */
export default function TextChatPanel() {
  const {
    selectedTextModel,
    balance,
    setDepositModalOpen,
    promptDrawerOpen,
    setPromptDrawerOpen,
    chatMessages,
    setChatMessages,
    clearChat,
    lastDeduction,
    setLastDeduction,
    ledgerConfigured,
    chargeCredits,
  } = useMarketplace()
  const { activeRental, meterCreditsOnly, rentalForListing } = useApiKeyMarket()

  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const inputId = useId()
  const scrollRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const usingRental = Boolean(activeRental && activeRental.studio === 'chat')
  const rental = usingRental ? rentalForListing(activeRental.listingId) : null
  const opperKey = (import.meta.env.VITE_OPPER_API_KEY || '').trim()
  const cost = usingRental
    ? activeRental.pricePerCallCredits || 0.02
    : selectedTextModel?.price_per_message_credits || 0.02
  const rentalBalance = rental?.creditsRemaining ?? 0
  const hasInsufficientBalance = usingRental
    ? rentalBalance < cost
    : balance < cost
  const systemPrompt =
    selectedTextModel?.system_prompt || 'You are a concise assistant.'
  const apiModel = usingRental
    ? defaultChatModelForProvider(activeRental.provider)
    : selectedTextModel?.api_model || 'openai/gpt-5-mini'
  const displayName = usingRental
    ? activeRental.title
    : selectedTextModel.display_name
  const tagline = usingRental
    ? `Rented ${activeRental.provider} · ${activeRental.keyMasked}`
    : selectedTextModel.tagline

  useEffect(() => {
    if (!promptDrawerOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [promptDrawerOpen])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatMessages, sending, promptDrawerOpen])

  useEffect(() => {
    setError(null)
    setDraft('')
  }, [selectedTextModel?.id])

  if (!promptDrawerOpen) return null

  const closeDrawer = () => setPromptDrawerOpen(false)

  /** Build OpenAI-style messages: system + prior turns + new user (docs pattern). */
  const buildMessages = (history) => {
    const turns = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))
    return [{ role: 'system', content: systemPrompt }, ...turns]
  }

  const callOpperConversation = async (history) => {
    const messages = buildMessages(history)

    if (usingRental) {
      const provider = String(activeRental.provider || 'openai').toLowerCase()
      const path = chatPathForProvider(provider)
      const payload = await vaultProxy({
        listingId: activeRental.onChain ? activeRental.listingId : undefined,
        ciphertextHex: activeRental.ciphertextHex || undefined,
        provider: provider === 'anthropic' ? 'openai' : provider,
        path,
        json: { model: apiModel, messages },
      })
      const data = payload.data
      const text = data?.choices?.[0]?.message?.content
      if (!text) throw new Error('Empty response from rented chat key')
      return {
        text: String(text),
        raw: data,
        finishReason: data.choices?.[0]?.finish_reason,
        keyMasked: payload.keyMasked,
      }
    }

    if (!opperKey) {
      throw new Error('Set VITE_OPPER_API_KEY in .env for Opper chat.')
    }

    const res = await fetch('/api/opper/v3/compat/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opperKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: apiModel,
        messages,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(
        data.error?.message || data.message || `HTTP ${res.status}`
      )
    }
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('Empty response from Opper chat')
    return {
      text: String(text),
      raw: data,
      finishReason: data.choices?.[0]?.finish_reason,
    }
  }

  const sendMessage = async () => {
    const content = draft.trim()
    if (!content || sending) return

    if (!isConnected) {
      openConnectModal?.()
      return
    }
    if (!usingRental && !ledgerConfigured) {
      setError('Credit ledger not configured. Deploy and set VITE_CREDIT_LEDGER_ADDRESS.')
      return
    }
    if (hasInsufficientBalance) {
      setError(
        usingRental
          ? `Need ${cost.toFixed(2)} rental credits. Deposit more ETH on the API market.`
          : `Need ${cost.toFixed(2)} credits. Deposit ETH to continue.`
      )
      if (!usingRental) setDepositModalOpen(true)
      return
    }

    setError(null)
    setSending(true)

    if (!usingRental) {
      try {
        await chargeCredits(cost)
      } catch (err) {
        setError(err?.message || 'On-chain credit spend failed.')
        setSending(false)
        return
      }
    }

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content,
      ts: new Date().toLocaleTimeString(),
    }
    const history = [...chatMessages, userMsg]
    setChatMessages(history)
    setDraft('')

    try {
      const result = await callOpperConversation(history)
      if (usingRental) {
        await meterCreditsOnly(activeRental.listingId)
        setLastDeduction(cost)
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: result.text,
          ts: new Date().toLocaleTimeString(),
          cost,
          raw: result.raw,
          finishReason: result.finishReason,
        },
      ])
    } catch (err) {
      setError(err.message || 'Chat request failed')
      setChatMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'system',
          content: `Error: ${err.message || 'Chat failed'}`,
          ts: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="prompt-drawer-root" id="text-chat-panel">
      <button
        type="button"
        className="prompt-drawer-backdrop"
        aria-label="Close chat panel"
        onClick={closeDrawer}
      />
      <aside
        className="prompt-drawer text-chat-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Chat ${displayName}`}
      >
        <header className="prompt-drawer-head">
          <div className="prompt-drawer-head-text">
            <p className="config-badge-model">
              {usingRental
                ? `Vault proxy · ${activeRental.provider} · ${apiModel}`
                : `Opper Conversations · ${apiModel}`}
            </p>
            <h2 className="config-title">{displayName}</h2>
            <p className="config-subtitle">{tagline}</p>
          </div>
          <div className="prompt-drawer-head-actions">
            <button
              type="button"
              className="view-sdk-code-btn"
              onClick={clearChat}
              disabled={chatMessages.length === 0}
            >
              Clear
            </button>
            <span className="config-rate-pill">
              <strong>${cost.toFixed(2)}/msg</strong>
            </span>
            <button
              type="button"
              className="prompt-drawer-close"
              onClick={closeDrawer}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="prompt-chat-scroll text-chat-scroll" ref={scrollRef}>
          {chatMessages.length === 0 && (
            <div className="prompt-chat-bubble is-system">
              {usingRental ? (
                <>
                  Chatting with rented key <strong>{activeRental.keyMasked}</strong>.
                  Each send decrypts on the Vince vault server and meters rental credits.
                  Key never leaves the server.
                </>
              ) : (
                <>
                  Multi-turn chat via <strong>Opper /v3/compat</strong>. Each send includes
                  full message history. Costs {cost.toFixed(2)} credits.
                </>
              )}
            </div>
          )}

          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`prompt-chat-bubble ${
                msg.role === 'user'
                  ? 'is-user'
                  : msg.role === 'system'
                    ? 'is-system is-error'
                    : 'is-assistant'
              }`}
            >
              <div className="text-chat-meta">
                <span>
                  {msg.role === 'user'
                    ? 'You'
                    : msg.role === 'system'
                      ? 'System'
                      : displayName}
                </span>
                {msg.ts && <span>{msg.ts}</span>}
                {msg.cost != null && <span>−{msg.cost.toFixed(2)} cr</span>}
              </div>
              <div className="text-chat-body">{msg.content}</div>
            </div>
          ))}

          {sending && (
            <div className="prompt-chat-bubble is-assistant is-typing">
              <span className="job-spinner" /> Thinking…
            </div>
          )}

          {error && (
            <div className="insufficient-balance-error">
              <span className="error-icon">⚠️</span>
              <span>
                {error}{' '}
                {hasInsufficientBalance && (
                  <button
                    type="button"
                    className="inline-deposit-link"
                    onClick={() => setDepositModalOpen(true)}
                  >
                    [Deposit ETH]
                  </button>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="prompt-drawer-foot text-chat-foot">
          <div className="estimated-cost-banner">
            <div className="cost-calc-text">
              Next message: <strong>{cost.toFixed(2)} credits</strong>
              {lastDeduction > 0 && (
                <span className="cost-breakdown">
                  · last −{lastDeduction.toFixed(2)}
                </span>
              )}
            </div>
            <div className="current-balance-preview">
              {usingRental ? (
                <>
                  Rental credits:{' '}
                  <strong>{rentalBalance.toFixed(2)}</strong>
                </>
              ) : (
                <>
                  Balance: <strong>{balance.toFixed(2)} credits</strong>
                </>
              )}
            </div>
          </div>

          <label htmlFor={inputId} className="sr-only">
            Message
          </label>
          <textarea
            id={inputId}
            className="config-textarea text-chat-input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            disabled={sending}
          />
          <button
            type="button"
            className={`generate-cta-btn${hasInsufficientBalance && isConnected ? ' is-disabled' : ''}`}
            onClick={sendMessage}
            disabled={sending || !draft.trim()}
          >
            {!isConnected
              ? 'Connect Wallet to Chat'
              : hasInsufficientBalance
                ? 'Insufficient Credits'
                : sending
                  ? 'Sending…'
                  : `Send · ${cost.toFixed(2)} credits`}
          </button>
        </div>
      </aside>
    </div>
  )
}
