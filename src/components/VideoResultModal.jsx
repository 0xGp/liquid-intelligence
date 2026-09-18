import React, { useState, useRef } from 'react'
import { useMarketplace } from '../context/MarketplaceContext'

export default function VideoResultModal() {
  const {
    videoModalOpen,
    setVideoModalOpen,
    jobResult,
    setJobResult,
    setJobState,
    setPromptDrawerOpen,
  } = useMarketplace()
  const [downloaded, setDownloaded] = useState(false)
  const [showPayload, setShowPayload] = useState(false)
  const videoRef = useRef(null)

  if (!videoModalOpen || !jobResult) return null

  const isPortrait = jobResult.aspectRatio === '9:16'
  const videoSource = jobResult.videoUrl || '/assets/models/kling_sample.mp4'

  const close = () => {
    setVideoModalOpen(false)
  }

  const generateAnother = () => {
    setVideoModalOpen(false)
    setJobState('idle')
    setJobResult(null)
    setPromptDrawerOpen(true)
  }

  return (
    <div
      className="video-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Generated video"
      onClick={close}
    >
      <div
        className={`video-modal-card ${isPortrait ? 'is-portrait' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="video-modal-head">
          <div>
            <h2 className="video-modal-title">{jobResult.modelName}</h2>
            <p className="video-modal-kicker">Ready to download</p>
          </div>
          <button type="button" className="video-modal-close" onClick={close} aria-label="Close">
            ✕
          </button>
        </header>

        <div className={`video-modal-frame ${isPortrait ? 'is-portrait-frame' : ''}`}>
          <video
            ref={videoRef}
            src={videoSource}
            controls
            autoPlay
            loop
            playsInline
            className="video-modal-player"
          />
        </div>

        <div className="video-modal-meta">
          <p className="video-modal-prompt">&ldquo;{jobResult.prompt}&rdquo;</p>
          <div className="video-modal-badges">
            <span>{jobResult.resolution}</span>
            <span>{jobResult.duration}s</span>
            <span>{jobResult.aspectRatio || '16:9'}</span>
            {jobResult.hasAudio ? <span>Audio</span> : null}
            <span>{jobResult.cost.toFixed(2)} credits</span>
          </div>
          {jobResult.interactionId && (
            <p className="video-modal-id">{jobResult.interactionId}</p>
          )}
        </div>

        {jobResult.rawResponse && (
          <button
            type="button"
            className="video-modal-payload-toggle"
            onClick={() => setShowPayload((v) => !v)}
          >
            {showPayload ? 'Hide API payload' : 'View API payload'}
          </button>
        )}
        {showPayload && jobResult.rawResponse && (
          <pre className="video-modal-payload">
            {JSON.stringify(jobResult.rawResponse, null, 2)}
          </pre>
        )}

        <div className="video-modal-actions">
          <a
            href={videoSource}
            download={videoSource.startsWith('blob:') ? 'generated_video.mp4' : undefined}
            target={videoSource.startsWith('http') ? '_blank' : undefined}
            rel={videoSource.startsWith('http') ? 'noreferrer' : undefined}
            className="video-modal-btn is-primary"
            onClick={() => setDownloaded(true)}
          >
            {downloaded ? 'Opened' : 'Download MP4'}
          </a>
          <button type="button" className="video-modal-btn" onClick={generateAnother}>
            Prompt again
          </button>
          <button type="button" className="video-modal-btn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
