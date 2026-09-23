import React, { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Eraser, SendHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarketplace } from '../context/MarketplaceContext'
import StudioSheet from './marketplace/StudioSheet'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import {
  vaultProxy,
  chatPathForProvider,
  defaultChatModelForProvider,
} from '../web3/vaultProxy'
import { useActiveAccount } from '../chain/useActiveAccount'

/**
 * Text chat via Opper Conversations (OpenAI-compatible gateway),
 * or via a rented marketplace key (vault proxy — key never in browser).
 * https://docs.opper.ai/build/gateway/conversations
 */
export default function TextChatPanel() {
  const {
    selectedTextModel,
    openDepositFrom,
    promptDrawerOpen,
    setPromptDrawerOpen,
    studioOrigin,
    chatMessages,
    setChatMessages,
    clearChat,
    lastDeduction,
    setLastDeduction,
  } = useMarketplace()
  const { activeRental, meterCreditsOnly, rentalForListing } = useApiKeyMarket()

  const { isConnected, connect, copy } = useActiveAccount()
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
  const hasInsufficientBalance = usingRental && rentalBalance < cost
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
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatMessages, sending, promptDrawerOpen])

  useEffect(() => {
    setError(null)
    setDraft('')
  }, [selectedTextModel?.id])

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

    if (usingRental) {
      if (!isConnected) {
        connect()
        return
      }
      if (hasInsufficientBalance) {
        setError(
          `Need ${cost.toFixed(2)} rental credits. Deposit more ETH on the API market.`
        )
        return
      }
    }

    setError(null)
    setSending(true)

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
          ...(usingRental ? { cost } : {}),
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
    <StudioSheet
      open={promptDrawerOpen}
      onClose={closeDrawer}
      origin={studioOrigin}
      label={`Chat ${displayName}`}
      wide
    >
        <header className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-[1.375rem] leading-tight text-foreground">
                {displayName}
              </h2>
              <p className="mt-1 truncate text-[13px] text-muted-foreground">{tagline}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={clearChat}
                disabled={chatMessages.length === 0}
                aria-label="Clear chat"
              >
                <Eraser size={15} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
                onClick={closeDrawer}
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6" ref={scrollRef}>
          {chatMessages.length === 0 && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {usingRental ? (
                <>
                  Rented key {activeRental.keyMasked}. Each send decrypts on the vault and
                  meters rental credits.
                </>
              ) : (
                <>Multi-turn chat. Each send includes the full conversation.</>
              )}
            </p>
          )}

          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed',
                msg.role === 'user'
                  ? 'ml-auto bg-accent text-accent-foreground'
                  : msg.role === 'system'
                    ? 'border border-warning/30 bg-warning-soft text-warning-ink'
                    : 'border border-border bg-background text-foreground',
              )}
            >
              <div
                className={cn(
                  'mb-1.5 flex flex-wrap gap-x-2 text-[11px]',
                  msg.role === 'user' ? 'text-background/70' : 'text-muted-foreground',
                )}
              >
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
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}

          {sending && (
            <p className="text-[13px] text-muted-foreground">Thinking…</p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-[13px] text-warning-ink">
              <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                {error}{' '}
                {hasInsufficientBalance && (
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
                    onClick={(e) => openDepositFrom(e.currentTarget)}
                  >
                    {copy.deposit}
                  </button>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          {usingRental && (
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
              <div className="text-muted-foreground">
                Next message{' '}
                <strong className="font-semibold text-foreground">
                  {cost.toFixed(2)} credits
                </strong>
                {lastDeduction > 0 && (
                  <span className="ms-1.5 text-[12px] text-muted-foreground/80">
                    · last −{lastDeduction.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-muted-foreground">
                Rental credits{' '}
                <strong className="font-semibold text-foreground">
                  {rentalBalance.toFixed(2)}
                </strong>
              </div>
            </div>
          )}

          <label htmlFor={inputId} className="sr-only">
            Message
          </label>
          <textarea
            id={inputId}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-[3px] focus-visible:ring-ring/40"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            disabled={sending}
          />
          <button
            type="button"
            className={cn(
              'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-92 disabled:opacity-40',
              usingRental &&
                hasInsufficientBalance &&
                isConnected &&
                'bg-muted text-muted-foreground',
            )}
            onClick={sendMessage}
            disabled={sending || !draft.trim()}
          >
            {usingRental && !isConnected
              ? 'Connect Wallet to Chat'
              : usingRental && hasInsufficientBalance
                ? 'Insufficient Credits'
                : sending
                  ? 'Sending…'
                  : 'Send'}
            {!sending && <SendHorizontal size={15} strokeWidth={2} aria-hidden />}
          </button>
        </div>
    </StudioSheet>
  )
}
