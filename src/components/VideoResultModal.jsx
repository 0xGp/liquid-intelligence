import React, { useState, useRef } from 'react'
import { Download, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-[#111318]/30 p-4 backdrop-blur-[3px] sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Generated video"
      onClick={close}
    >
      <div
        className={`video-zoom-pop max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-md sm:p-6 ${
          isPortrait ? 'max-w-[420px]' : 'max-w-[720px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-[1.75rem] leading-tight text-foreground">
              {jobResult.modelName}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Ready to download</p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
            onClick={close}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div
          className={`overflow-hidden rounded-xl bg-secondary ${
            isPortrait ? 'mx-auto max-w-[280px]' : ''
          }`}
        >
          <video
            ref={videoRef}
            src={videoSource}
            controls
            autoPlay
            loop
            playsInline
            className="block w-full"
          />
        </div>

        <p className="mt-5 text-[14px] leading-relaxed text-foreground">
          “{jobResult.prompt}”
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            jobResult.resolution,
            `${jobResult.duration}s`,
            jobResult.aspectRatio || '16:9',
            jobResult.hasAudio ? 'Audio' : null,
            jobResult.billed ? `${jobResult.cost.toFixed(2)} credits` : null,
          ]
            .filter(Boolean)
            .map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {item}
              </span>
            ))}
        </div>

        {jobResult.rawResponse && (
          <button
            type="button"
            className="mt-4 text-[13px] font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => setShowPayload((v) => !v)}
          >
            {showPayload ? 'Hide API payload' : 'View API payload'}
          </button>
        )}
        {showPayload && jobResult.rawResponse && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-secondary p-3 text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(jobResult.rawResponse, null, 2)}
          </pre>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="rounded-full text-white!">
            <a
              href={videoSource}
              download={videoSource.startsWith('blob:') ? 'generated_video.mp4' : undefined}
              target={videoSource.startsWith('http') ? '_blank' : undefined}
              rel={videoSource.startsWith('http') ? 'noreferrer' : undefined}
              onClick={() => setDownloaded(true)}
            >
              <Download size={15} strokeWidth={2} aria-hidden />
              {downloaded ? 'Opened' : 'Download MP4'}
            </a>
          </Button>
          <Button type="button" variant="outline" className="rounded-full bg-background" onClick={generateAnother}>
            <RotateCcw size={15} strokeWidth={2} aria-hidden />
            Prompt again
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
