import React, { useState, useMemo } from 'react'
import {
  ArrowUpRight,
  Check,
  Clapperboard,
  Cpu,
  MessageSquare,
  SlidersHorizontal,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
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
import { useMarketplace } from '../context/MarketplaceContext'

const WIRED_VIDEO_IDS = new Set([
  'opper-video',
  'gemini-omni-flash',
  'sora-2',
  'sora-2-pro',
  'kling-3-0-pro',
])

const WIRED_TEXT_IDS = new Set([
  'opper-gpt-5-mini',
  'opper-gpt-4o-mini',
  'opper-gpt-4o',
  'opper-gemini-flash',
])

function modelIcon(model, isText) {
  const p = String(model.provider || '').toLowerCase()
  if (isText) return MessageSquare
  if (p.includes('openai') || String(model.id).includes('sora')) return Sparkles
  if (p.includes('google') || String(model.id).includes('gemini')) return Video
  if (p.includes('kuaishou') || String(model.id).includes('kling')) return Clapperboard
  if (p.includes('opper')) return Cpu
  return Video
}

export default function MarketplaceGrid() {
  const {
    models,
    textModels,
    marketplaceTab,
    selectedModelId,
    setSelectedModelId,
    selectedTextModelId,
    setSelectedTextModelId,
    openStudioFrom,
    setJobState,
    setJobResult,
    setJobError,
  } = useMarketplace()

  const isText = marketplaceTab === 'text'
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeSort, setActiveSort] = useState('Price: Low to High')

  const sourceList = isText ? textModels : models

  const filteredModels = useMemo(() => {
    let list = sourceList.filter((m) => {
      if (m.status === 'deprecated') return false
      if (isText) return WIRED_TEXT_IDS.has(m.id)
      return (
        WIRED_VIDEO_IDS.has(m.id) &&
        (m.integration === 'live' || m.integration === 'code' || m.api_model)
      )
    })

    if (!isText) {
      if (activeFilter === 'Live API') {
        list = list.filter((m) => m.integration === 'live')
      } else if (activeFilter === 'Native Audio') {
        list = list.filter((m) => m.native_audio)
      } else if (activeFilter === '4K') {
        list = list.filter((m) => m.max_resolution === '4K')
      }
    } else if (activeFilter === 'Live API') {
      list = list.filter((m) => m.integration === 'live')
    } else if (activeFilter === 'Fast') {
      list = list.filter((m) => m.speed_tier === 'fast')
    }

    if (activeSort === 'Price: Low to High') {
      list = [...list].sort((a, b) => {
        const pa = isText ? a.price_per_message_credits : a.price_per_second_credits
        const pb = isText ? b.price_per_message_credits : b.price_per_second_credits
        return pa - pb
      })
    } else if (activeSort === 'Resolution' && !isText) {
      const rank = { '4K': 3, '1080p': 2, '720p': 1 }
      list = [...list].sort(
        (a, b) => (rank[b.max_resolution] || 0) - (rank[a.max_resolution] || 0),
      )
    } else if (activeSort === 'Context' && isText) {
      list = [...list].sort((a, b) => {
        const na = parseInt(String(a.context_window), 10) || 0
        const nb = parseInt(String(b.context_window), 10) || 0
        return nb - na
      })
    }

    return list
  }, [sourceList, isText, activeFilter, activeSort])

  const openModel = (model, el) => {
    if (model.status === 'unavailable') return
    if (isText) {
      setSelectedTextModelId(model.id)
    } else {
      setSelectedModelId(model.id)
      setJobState('idle')
      setJobResult(null)
      setJobError(null)
    }
    openStudioFrom(el)
  }

  const filters = isText ? ['All', 'Live API', 'Fast'] : ['All', 'Live API', 'Native Audio', '4K']

  return (
    <section id="marketplace-grid" className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Model filters">
          {filters.map((filter) => {
            const active = activeFilter === filter
            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-200',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
                )}
                onClick={() => setActiveFilter(filter)}
              >
                {active && <Check size={14} strokeWidth={2.25} aria-hidden />}
                {filter}
              </button>
            )
          })}
        </div>

        <label className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value)}
            className="h-10 rounded-full border border-border bg-card px-4 pe-8 text-[13px] font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <option value="Price: Low to High">Price: Low to High</option>
            {isText ? (
              <option value="Context">Context window</option>
            ) : (
              <option value="Resolution">Resolution</option>
            )}
          </select>
        </label>
      </div>

      {filteredModels.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No models match this filter"
            description="Try a different capability filter to see the models wired up for this studio."
            action={
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-card px-5"
                onClick={() => setActiveFilter('All')}
              >
                Show all models
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {filteredModels.map((model) => {
            const isSelected = isText
              ? selectedTextModelId === model.id
              : selectedModelId === model.id
            const isLive = model.integration === 'live'
            const price = isText
              ? model.price_per_message_credits
              : model.price_per_second_credits
            const Icon = modelIcon(model, isText)

            return (
              <Card
                key={model.id}
                role="button"
                tabIndex={0}
                data-model-card
                aria-pressed={isSelected}
                aria-label={`${isText ? 'Open chat with' : 'Use'} ${model.display_name}`}
                onClick={(e) => openModel(model, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openModel(model, e.currentTarget)
                  }
                }}
                className={cn(
                  'mp-studio-card cursor-pointer gap-0 overflow-hidden p-0',
                  isSelected ? 'border-foreground shadow-md' : 'hover:shadow-md',
                )}
              >
                <CardHeader className="gap-4 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    {isLive ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800"
                      >
                        <Zap size={11} strokeWidth={2.25} aria-hidden />
                        {model.badge}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="px-2.5 py-1 text-[11px]">
                        {model.badge}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[13px] font-medium text-muted-foreground">{model.provider}</p>
                    <CardTitle className="text-[18px] sm:text-[19px]">{model.display_name}</CardTitle>
                    <CardDescription className="text-[14px] leading-relaxed">
                      {model.tagline}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pb-5 pt-0 sm:px-6">
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {model.description}
                  </p>
                </CardContent>

                <CardFooter className="mt-auto flex-col items-stretch gap-4 border-t border-border p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-3">
                    <span className="text-[20px] font-semibold tabular-nums leading-none text-foreground">
                      ${Number(price).toFixed(2)}
                      <small className="ms-1 text-[12px] font-medium text-muted-foreground">
                        {isText ? '/msg' : '/sec'}
                      </small>
                    </span>
                    <span className="text-end text-[12px] leading-snug text-muted-foreground">
                      {isText
                        ? `${model.context_window} context · ${model.speed_tier}`
                        : `${model.max_resolution} · ${model.max_duration_seconds}s${
                            model.native_audio ? ' · audio' : ''
                          }`}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold',
                      isSelected
                        ? 'bg-foreground text-background'
                        : 'border border-border bg-background text-foreground',
                    )}
                  >
                    {isText ? 'Open chat' : 'Use model'}
                    <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
                  </span>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
