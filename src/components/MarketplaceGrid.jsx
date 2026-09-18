import React, { useState, useMemo } from 'react'
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

export default function MarketplaceGrid() {
  const {
    models,
    textModels,
    marketplaceTab,
    selectedModelId,
    setSelectedModelId,
    selectedTextModelId,
    setSelectedTextModelId,
    setPromptDrawerOpen,
    setJobState,
    setJobResult,
    setJobError,
  } = useMarketplace()

  const isText = marketplaceTab === 'text'
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeSort, setActiveSort] = useState(
    isText ? 'Price: Low to High' : 'Price: Low to High'
  )

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
        const pa = isText
          ? a.price_per_message_credits
          : a.price_per_second_credits
        const pb = isText
          ? b.price_per_message_credits
          : b.price_per_second_credits
        return pa - pb
      })
    } else if (activeSort === 'Resolution' && !isText) {
      const rank = { '4K': 3, '1080p': 2, '720p': 1 }
      list = [...list].sort(
        (a, b) => (rank[b.max_resolution] || 0) - (rank[a.max_resolution] || 0)
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

  const openModel = (model) => {
    if (model.status === 'unavailable') return
    if (isText) {
      setSelectedTextModelId(model.id)
    } else {
      setSelectedModelId(model.id)
      setJobState('idle')
      setJobResult(null)
      setJobError(null)
    }
    setPromptDrawerOpen(true)
  }

  const videoFilters = ['All', 'Live API', 'Native Audio', '4K']
  const textFilters = ['All', 'Live API', 'Fast']

  return (
    <section className="marketplace-section" id="marketplace-grid">
      <div className="marketplace-head">
        <h2>{isText ? 'Text LLMs' : 'Video models'}</h2>
        <p>
          {isText
            ? 'Pick a chat model — Opper Conversations with full message history each turn.'
            : 'Pick a wired provider — a chat panel opens to prompt and generate.'}
        </p>

        <div className="marketplace-toolbar">
          <div className="filter-group" role="tablist" aria-label="Model filters">
            {(isText ? textFilters : videoFilters).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-btn ${activeFilter === filter ? 'is-active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <label className="sort-group">
            <span className="sort-label">Sort</span>
            <select
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value)}
              className="sort-select"
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
      </div>

      <div className="model-card-grid">
        {filteredModels.map((model) => {
          const isSelected = isText
            ? selectedTextModelId === model.id
            : selectedModelId === model.id
          const isLive = model.integration === 'live'
          const price = isText
            ? model.price_per_message_credits
            : model.price_per_second_credits

          return (
            <article
              key={model.id}
              className={`mp-model-card ${isSelected ? 'is-selected' : ''} ${
                isText ? 'is-text-model' : ''
              }`}
            >
              <div className="mp-card-top">
                <p className="model-provider">{model.provider}</p>
                <span className={`model-badge ${isLive ? 'is-live' : 'is-code'}`}>
                  {model.badge}
                </span>
              </div>
              <h3 className="model-title">{model.display_name}</h3>
              <p className="model-tagline">{model.tagline}</p>
              <p className="model-desc">{model.description}</p>
              <div className="mp-card-specs">
                <span className="model-price-rate">
                  ${Number(price).toFixed(2)}
                  <small>{isText ? '/msg' : '/sec'}</small>
                </span>
                <span className="model-spec-line">
                  {isText
                    ? `${model.context_window} context · ${model.speed_tier}`
                    : `${model.max_resolution} · ${model.max_duration_seconds}s${
                        model.native_audio ? ' · audio' : ''
                      }`}
                </span>
              </div>
              <button
                type="button"
                className={`model-cta-btn ${isSelected ? 'is-active' : ''}`}
                onClick={() => openModel(model)}
              >
                {isText ? 'Open chat' : 'Use model'}
              </button>
            </article>
          )
        })}
      </div>

      {filteredModels.length === 0 && (
        <p className="model-list-empty">No models match this filter.</p>
      )}
    </section>
  )
}
