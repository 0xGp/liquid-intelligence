import React, { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Cpu,
  Eye,
  EyeOff,
  Gem,
  KeyRound,
  Pause,
  Play,
  Shield,
  Sparkles,
} from 'lucide-react'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import { KEY_PROVIDERS, KIND_LABELS, maskApiKey } from '../web3/apiKeyMarket'
import { isVaultPublicKeyConfigured } from '../web3/vaultCrypto'
import { shortId } from '../web3/agents'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'details', label: 'Details' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'secure', label: 'Secure' },
  { id: 'publish', label: 'Publish' },
]

const PROVIDER_ICONS = {
  openai: Sparkles,
  gemini: Gem,
  opper: Cpu,
  kling: Clapperboard,
  anthropic: Bot,
  other: KeyRound,
}

const KIND_ICONS = {
  chat: Bot,
  video: Clapperboard,
  image: Sparkles,
}

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40'

export default function ListKeyPage() {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { createListing, myListings, pauseListing, platformFeeBps, onChainEnabled, vaultReady, marketAddress } =
    useApiKeyMarket()

  const [step, setStep] = useState(0)
  const [provider, setProvider] = useState('openai')
  const [kind, setKind] = useState('chat')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0.05')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const kinds = useMemo(() => {
    const p = KEY_PROVIDERS.find((x) => x.id === provider)
    return p?.kinds || ['chat']
  }, [provider])

  const goBack = () => {
    window.location.hash = '#'
  }

  const canNext = () => {
    if (step === 0) return Boolean(title.trim() && description.trim())
    if (step === 1) return Number(price) > 0
    if (step === 2) return Boolean(apiKey.trim()) && isVaultPublicKeyConfigured()
    return true
  }

  const onPublish = async () => {
    setError('')
    setDone(null)
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setBusy(true)
    try {
      const listing = await createListing({
        provider,
        kind,
        title,
        description,
        pricePerCallCredits: price,
        apiKey,
      })
      setDone(listing)
      setApiKey('')
      setTitle('')
      setDescription('')
      setStep(0)
    } catch (err) {
      setError(err?.shortMessage || err?.message || 'Could not publish listing.')
    } finally {
      setBusy(false)
    }
  }

  const providerLabel = KEY_PROVIDERS.find((p) => p.id === provider)?.label || provider
  const listerShare = (10000 - platformFeeBps) / 100

  return (
    <div className="min-h-screen bg-[#F0F1F4]">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 lg:px-14 xl:px-20">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mb-10 size-10 rounded-full bg-card"
          onClick={goBack}
          aria-label="Back to home"
        >
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
        </Button>

        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[40rem]">
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] text-foreground">
              List an API key
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
              Publish a key for others to rent. Each metered call pays you {listerShare}% after the
              platform fee.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" className="h-10 min-h-10 rounded-full bg-card px-5">
              <a href="#api-market">Browse market</a>
            </Button>
            <Button asChild className="h-10 min-h-10 rounded-full px-5">
              <a href="#earnings">Your earnings</a>
            </Button>
          </div>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] lg:gap-6">
          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="gap-5 border-b border-border p-5 sm:p-6">
              <div
                className="inline-flex w-full gap-1 self-start rounded-full border border-border bg-background p-1 sm:w-auto"
                role="tablist"
                aria-label="Listing progress"
              >
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === step}
                    className={cn(
                      'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors sm:flex-none sm:px-4 sm:text-[13px]',
                      i === step
                        ? 'bg-foreground text-background'
                        : i < step
                          ? 'text-foreground hover:bg-secondary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                    onClick={() => {
                      if (i <= step) setStep(i)
                    }}
                  >
                    {i < step ? <Check size={13} strokeWidth={2.25} aria-hidden /> : null}
                    {s.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {step === 0 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <CardTitle className="text-[22px]">API details</CardTitle>
                    <CardDescription className="mt-2">
                      Connected as {address ? shortId(address) : '—'}. Choose provider and describe
                      what renters get.
                    </CardDescription>
                  </div>

                  <fieldset>
                    <legend className="text-[13px] font-medium text-muted-foreground">Provider</legend>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {KEY_PROVIDERS.map((p) => {
                        const Icon = PROVIDER_ICONS[p.id] || KeyRound
                        const active = provider === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setProvider(p.id)
                              if (!p.kinds.includes(kind)) setKind(p.kinds[0])
                            }}
                            className={cn(
                              'flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-shadow',
                              active
                                ? 'border-foreground bg-card shadow-md'
                                : 'border-border bg-background hover:shadow-md',
                            )}
                          >
                            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground">
                              <Icon size={18} strokeWidth={1.75} aria-hidden />
                            </span>
                            <span className="text-[14px] font-semibold text-foreground">{p.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-[13px] font-medium text-muted-foreground">Capability</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {kinds.map((k) => {
                        const Icon = KIND_ICONS[k] || KeyRound
                        const active = kind === k
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setKind(k)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors',
                              active
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <Icon size={14} strokeWidth={2} aria-hidden />
                            {KIND_LABELS[k] || k}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="text-[13px] font-medium text-muted-foreground">Listing title</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. OpenAI gpt-4o-mini lane"
                      required
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-medium text-muted-foreground">
                      What renters get
                    </span>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Rate limits, model names, and any usage notes."
                      required
                      className={cn(fieldClass, 'min-h-[6.5rem] resize-y')}
                    />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <CardTitle className="text-[22px]">Pricing</CardTitle>
                    <CardDescription className="mt-2">
                      Set the credit cost per metered call. Renters deposit ETH; credits burn per call.
                    </CardDescription>
                  </div>
                  <label className="block">
                    <span className="text-[13px] font-medium text-muted-foreground">
                      Price per metered call (credits)
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className={fieldClass}
                    />
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      You receive {listerShare}% of burned value after the platform fee.
                    </p>
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <CardTitle className="text-[22px]">Secure key</CardTitle>
                    <CardDescription className="mt-2">
                      Vault pubkey:{' '}
                      {isVaultPublicKeyConfigured()
                        ? 'RSA ready'
                        : 'invalid — run generate-vault-keys.mjs'}{' '}
                      · Server decrypt:{' '}
                      {vaultReady === false ? 'private key missing' : vaultReady ? 'ready' : '…'} ·
                      Market: {onChainEnabled ? shortId(marketAddress) : 'not set (local sealed fallback)'}
                    </CardDescription>
                  </div>

                  <div className="flex gap-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground">
                      <Shield size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-foreground">
                        Your raw API key is encrypted before publishing.
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        Only encrypted ciphertext is stored on-chain. Decryption happens server-side —
                        the key never returns to the browser.
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-[13px] font-medium text-muted-foreground">API key</span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Your provider API key"
                        autoComplete="off"
                        required
                        className={cn(fieldClass, 'mt-0 flex-1')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto rounded-2xl bg-card px-4"
                        onClick={() => setShowKey((v) => !v)}
                      >
                        {showKey ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                        {showKey ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      {apiKey
                        ? `Public mask: ${maskApiKey(apiKey)}`
                        : 'This key is encrypted before publishing.'}
                    </p>
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <CardTitle className="text-[22px]">Review & publish</CardTitle>
                    <CardDescription className="mt-2">
                      Confirm the listing before it goes on-chain for renters.
                    </CardDescription>
                  </div>
                  <dl className="grid gap-3">
                    {[
                      { dt: 'Provider', dd: `${providerLabel} · ${KIND_LABELS[kind] || kind}` },
                      { dt: 'Title', dd: title },
                      { dt: 'Description', dd: description },
                      { dt: 'Price', dd: `${price} credits / call` },
                      { dt: 'Key mask', dd: apiKey ? maskApiKey(apiKey) : '—' },
                    ].map((row) => (
                      <div
                        key={row.dt}
                        className="flex flex-col gap-1 rounded-2xl border border-border bg-background px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between"
                      >
                        <dt className="text-[12px] font-medium text-muted-foreground">{row.dt}</dt>
                        <dd className="m-0 text-[14px] font-medium text-foreground">{row.dd}</dd>
                      </div>
                    ))}
                  </dl>
                  {error ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                      {error}
                    </p>
                  ) : null}
                  {done ? (
                    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
                      Listed <strong>{done.title}</strong>. Renters can deposit ETH on the market page.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>

            <CardFooter className="mt-0 justify-between border-t border-border p-5 sm:p-6">
              {step > 0 ? (
                <Button variant="ghost" className="rounded-full" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft size={16} aria-hidden /> Back
                </Button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  className="rounded-full px-6"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue <ChevronRight size={16} aria-hidden />
                </Button>
              ) : (
                <Button
                  className="rounded-full px-6"
                  disabled={busy}
                  onClick={onPublish}
                >
                  {busy ? 'Publishing…' : !isConnected ? 'Connect wallet to list' : 'Publish listing'}
                </Button>
              )}
            </CardFooter>
          </Card>

          <aside className="flex flex-col gap-4">
            <h2 className="text-[22px] text-foreground">Your listings</h2>
            {myListings.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No listings yet"
                description="Publish your first key to start earning when others rent access."
              />
            ) : (
              <ul className="grid gap-4">
                {myListings.map((listing) => {
                  const Icon = PROVIDER_ICONS[listing.provider] || KeyRound
                  const active = listing.status === 'active'
                  return (
                    <li key={listing.id}>
                      <Card className="gap-0 overflow-hidden p-0">
                        <CardHeader className="gap-4 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                              <Icon size={18} strokeWidth={1.75} aria-hidden />
                            </span>
                            <Badge
                              variant={active ? 'secondary' : 'outline'}
                              className={cn(
                                'px-2.5 py-1 text-[11px]',
                                active && 'bg-emerald-50 text-emerald-800',
                              )}
                            >
                              {listing.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[13px] font-medium text-muted-foreground">
                              {listing.provider} · {KIND_LABELS[listing.kind] || listing.kind}
                            </p>
                            <CardTitle className="text-[18px]">{listing.title}</CardTitle>
                            <CardDescription>{listing.keyMasked}</CardDescription>
                          </div>
                        </CardHeader>
                        <CardFooter className="mt-0 flex-col items-stretch gap-3 border-t border-border p-5">
                          <div className="flex items-end justify-between">
                            <span className="text-[20px] font-semibold tabular-nums leading-none text-foreground">
                              {listing.pricePerCallCredits}
                              <small className="ms-1 text-[12px] font-medium text-muted-foreground">
                                /call
                              </small>
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full rounded-full bg-background"
                            onClick={() => pauseListing(listing.id)}
                          >
                            {active ? (
                              <Pause size={15} strokeWidth={2} aria-hidden />
                            ) : (
                              <Play size={15} strokeWidth={2} aria-hidden />
                            )}
                            {active ? 'Pause listing' : 'Resume listing'}
                          </Button>
                        </CardFooter>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
