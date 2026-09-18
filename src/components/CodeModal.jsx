import React, { useState } from 'react'
import { veoCodeSnippets } from '../data/veoCodeSnippets'
import { klingCodeSnippets } from '../data/klingCodeSnippets'
import { omniCodeSnippets } from '../data/omniCodeSnippets'
import { soraCodeSnippets } from '../data/soraCodeSnippets'
import { opperCodeSnippets } from '../data/opperCodeSnippets'

export default function CodeModal({ isOpen, onClose, modelId }) {
  const isVeo = modelId === 'veo-3-1'
  const isKling = modelId === 'kling-3-0-pro'
  const isOmni = modelId === 'gemini-omni-flash'
  const isSora = modelId === 'sora-2' || modelId === 'sora-2-pro'
  const isOpper = modelId === 'opper-video'
  const hasTabs = isVeo || isKling || isOmni || isSora || isOpper

  const [activeTab, setActiveTab] = useState('javascript')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const getCode = () => {
    if (isOpper) return opperCodeSnippets[activeTab] || opperCodeSnippets.javascript
    if (isSora) return soraCodeSnippets[activeTab] || soraCodeSnippets.javascript
    if (isOmni) return omniCodeSnippets[activeTab] || omniCodeSnippets.javascript
    if (isVeo) return veoCodeSnippets[activeTab] || veoCodeSnippets.javascript
    if (isKling) return klingCodeSnippets[activeTab] || klingCodeSnippets.javascript
    return `// Model: ${modelId}\n// Rate: Metered per compute second on Robinhood Chain`
  }

  const code = getCode()

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const title = isOpper
    ? 'Opper · POST /v3/videos'
    : isSora
      ? 'OpenAI Sora · Videos API'
      : isOmni
        ? 'Gemini Omni Flash · Interactions API'
        : isVeo
          ? 'Google Veo 3.1 Integration Code'
          : isKling
            ? 'Kling 3.0 Pro Generation & Polling'
            : 'API Integration Code'

  const badge = isOpper
    ? 'Opper · async video gateway'
    : isSora
      ? `OpenAI · ${modelId === 'sora-2-pro' ? 'sora-2-pro' : 'sora-2'}`
      : isOmni
        ? 'Gemini · gemini-omni-1.1-flash'
        : isVeo
          ? 'Gemini API · Veo 3.1'
          : isKling
            ? 'Kling 3.0 Pro API'
            : 'Model API'

  const desc = isOpper
    ? 'Submit → poll status_url → download. Key from OPPER_API_KEY / VITE_OPPER_API_KEY. Docs: docs.opper.ai/v3-api-reference/video/create-video'
    : isSora
      ? 'Create → poll → download via Videos API. Key from OPENAI_API_KEY / VITE_OPENAI_API_KEY.'
      : isOmni
        ? 'Official Interactions API for text/image-to-video, conversational edits, and extension.'
        : isVeo
          ? 'Official code using veo-3.1-generate-preview with generateVideos long-running operation.'
          : isKling
            ? 'Live fetch via kling3api.com. Key from VITE_KLING_API_KEY in .env only (no UI paste).'
            : 'Programmatic API request code for this model.'

  return (
    <div className="code-modal-overlay" onClick={onClose}>
      <div className="code-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="code-modal-header">
          <div className="code-modal-title-group">
            <span className="code-modal-badge">{badge}</span>
            <h3 className="code-modal-title">{title}</h3>
            <p className="code-modal-desc">{desc}</p>
          </div>
          <button type="button" className="code-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="code-modal-tabs-row">
          <div className="code-modal-tabs">
            {hasTabs ? (
              <>
                <button
                  type="button"
                  className={`code-tab-btn ${activeTab === 'javascript' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('javascript')}
                >
                  JavaScript
                </button>
                {(isVeo || isOmni || isSora || isOpper) && (
                  <button
                    type="button"
                    className={`code-tab-btn ${activeTab === 'python' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('python')}
                  >
                    Python
                  </button>
                )}
                <button
                  type="button"
                  className={`code-tab-btn ${activeTab === (isKling ? 'curl' : 'rest') ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(isKling ? 'curl' : 'rest')}
                >
                  {isKling ? 'cURL' : 'REST'}
                </button>
                {isVeo && (
                  <button
                    type="button"
                    className={`code-tab-btn ${activeTab === 'go' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('go')}
                  >
                    Go
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="code-tab-btn is-active">
                Snippet
              </button>
            )}
          </div>
          <button type="button" className="code-copy-btn" onClick={copyToClipboard}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <pre className="code-modal-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
