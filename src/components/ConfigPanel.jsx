import React, { useState, useId, useRef, useEffect } from 'react'
import { AlertTriangle, Code2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarketplace } from '../context/MarketplaceContext'
import StudioSheet from './marketplace/StudioSheet'
import CodeModal from './CodeModal'
import { veoPrompts } from '../data/veoCodeSnippets'
import {
  omniPrompts,
  extractOmniVideo,
  base64ToVideoUrl,
  fileToBase64,
} from '../data/omniCodeSnippets'
import {
  soraPrompts,
  soraSizeFromUi,
  snapSoraDuration,
  SORA_DURATIONS,
} from '../data/soraCodeSnippets'
import {
  opperPrompts,
  OPPER_BACKEND_MODELS,
  opperSizeFromUi,
  opperParametersFor,
} from '../data/opperCodeSnippets'
import { useApiKeyMarket } from '../web3/ApiKeyMarketContext'
import { vaultProxy } from '../web3/vaultProxy'
import { useActiveAccount } from '../chain/useActiveAccount'

const studioChip =
  'inline-flex h-8 max-w-full items-center truncate rounded-full border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-secondary'
const studioChipOn =
  'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background'

export default function ConfigPanel() {
  const {
    selectedModel,
    selectedModelId,
    setSelectedModelId,
    balance,
    openDepositFrom,
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
    setVideoModalOpen,
    ledgerConfigured,
    chargeCredits,
  } = useMarketplace()
  const { activeRental, meterCreditsOnly, rentalForListing } = useApiKeyMarket()

  const usingRental = Boolean(activeRental && activeRental.studio === 'video')
  const rental = usingRental ? rentalForListing(activeRental.listingId) : null
  const rentalBalance = rental?.creditsRemaining ?? 0

  const { isConnected, connect, copy: chainCopy } = useActiveAccount()
  const asset = chainCopy.asset

  const promptId = useId()
  const durationId = useId()
  const resolutionId = useId()
  const audioId = useId()

  const [prompt, setPrompt] = useState(
    'A cinematic shot of mountains at sunrise'
  )
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState('1080p')
  const aspectRatio = '16:9'
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [refImage, setRefImage] = useState(null)
  const [refImages, setRefImages] = useState([null, null, null])
  const [firstFrame, setFirstFrame] = useState(null)
  const [lastFrame, setLastFrame] = useState(null)
  const veoMode = 'text'
  const omniMode = 'text'
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [forceFailTest, setForceFailTest] = useState(false)
  const klingPollGenerationRef = useRef(0)

  useEffect(() => {
    if (!promptDrawerOpen) {
      klingPollGenerationRef.current += 1
    }
    return () => {
      klingPollGenerationRef.current += 1
    }
  }, [promptDrawerOpen])

  // Kling live API — key from env only (no UI paste)
  const klingKey = (import.meta.env.VITE_KLING_API_KEY || '').trim()
  const [apiLogs, setApiLogs] = useState([])
  const [rawApiResponse, setRawApiResponse] = useState(null)

  // Gemini Omni Flash
  const [geminiKey, setGeminiKey] = useState(
    () => import.meta.env.VITE_GEMINI_API_KEY || ''
  )
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [previousInteractionId, setPreviousInteractionId] = useState(null)
  const [editPrompt, setEditPrompt] = useState('Keep everything else the same. ')
  const [firstFrameFile, setFirstFrameFile] = useState(null)
  const [lastFrameFile, setLastFrameFile] = useState(null)
  const [refImageFiles, setRefImageFiles] = useState([null, null, null])

  // OpenAI Sora (Videos API)
  const [openaiKey, setOpenaiKey] = useState(
    () => import.meta.env.VITE_OPENAI_API_KEY || ''
  )
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const soraMode = 'text'
  const [lastSoraVideoId, setLastSoraVideoId] = useState(null)
  const [soraEditPrompt, setSoraEditPrompt] = useState(
    'Shift the color palette to teal, sand, and rust, with a warm backlight.'
  )

  // Opper unified Videos API
  const [opperKey, setOpperKey] = useState(
    () => import.meta.env.VITE_OPPER_API_KEY || ''
  )
  const [showOpperKey, setShowOpperKey] = useState(false)
  const [opperBackend, setOpperBackend] = useState(
    () => OPPER_BACKEND_MODELS[0].id
  )
  const opperMode = 'text'

  const isVeo = selectedModel.id === 'veo-3-1'
  const isKling = selectedModel.id === 'kling-3-0-pro'
  const isOmni = selectedModel.id === 'gemini-omni-flash'
  const isSora =
    selectedModel.id === 'sora-2' || selectedModel.id === 'sora-2-pro'
  const isSoraPro = selectedModel.id === 'sora-2-pro'
  const isOpper = selectedModel.id === 'opper-video'
  const isOpenSora = selectedModel.id === 'open-sora-2'
  const soraApiModel = selectedModel.api_model || selectedModel.id

  // Model-switch effect to intelligently set appropriate defaults
  const prevModelId = useRef(selectedModel.id)
  useEffect(() => {
    if (prevModelId.current !== selectedModel.id) {
      if (isOmni) {
        setPrompt(omniPrompts[0].prompt)
        setDuration(8)
        setResolution('720p')
        setAudioEnabled(true)
        setPreviousInteractionId(null)
      } else if (isOpper) {
        setPrompt(opperPrompts[0].prompt)
        setDuration(4)
        setResolution('720p')
        setAudioEnabled(true)
        setOpperBackend(OPPER_BACKEND_MODELS[0].id)
      } else if (isSora) {
        setPrompt(soraPrompts[0].prompt)
        setDuration(8)
        setResolution(isSoraPro ? '1080p' : '720p')
        setAudioEnabled(true)
        setLastSoraVideoId(null)
      } else if (isVeo) {
        setPrompt("A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, 'This must be it. That\\'s the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'")
        setDuration(8)
        setResolution('1080p')
        setAudioEnabled(true)
      } else if (isKling) {
        setPrompt('A cinematic shot of mountains at sunrise')
        setDuration(5)
        setResolution('1080p')
          } else if (isOpenSora) {
        setPrompt(
          'A hyper-detailed cinematic drone tracking shot following an electric vehicle gliding over neon rain-slicked city streets at night, warm reflections, 8k anamorphic depth'
        )
        setDuration(8)
        setResolution('720p')
          }
      prevModelId.current = selectedModel.id
    }
  }, [selectedModel.id, isVeo, isKling, isOmni, isSora, isSoraPro, isOpper, isOpenSora])

  const opperBackendMeta =
    OPPER_BACKEND_MODELS.find((m) => m.id === opperBackend) || OPPER_BACKEND_MODELS[0]
  const opperUsesSoraParams = opperBackend.startsWith('openai/')

  const maxDuration =
    isVeo && veoMode === 'extension'
      ? 148
      : isOmni && omniMode === 'extend'
        ? selectedModel?.extension_max_seconds || 40
        : selectedModel?.max_duration_seconds || 8
  const maxRes = selectedModel?.max_resolution || '1080p'
  const activeDuration =
    isSora || (isOpper && opperUsesSoraParams)
      ? snapSoraDuration(Math.min(duration, maxDuration))
      : Math.min(duration, maxDuration)

  const availableResolutions = []
  if (isOmni) {
    availableResolutions.push('360p', '720p', '1080p', '4K')
  } else if (isSora || isOpper) {
    availableResolutions.push('720p')
    if (isSoraPro || isOpper) availableResolutions.push('1080p')
  } else if (maxRes === '4K') {
    availableResolutions.push('720p', '1080p', '4K')
  } else if (maxRes === '1080p') {
    availableResolutions.push('720p', '1080p')
  } else {
    availableResolutions.push('720p')
  }

  const activeResolution = availableResolutions.includes(resolution)
    ? resolution
    : availableResolutions[availableResolutions.length - 1]

  const resMultiplier = activeResolution === '4K' ? 1.25 : 1.0
  const baseRate = selectedModel?.price_per_second_credits || 0.1
  const estimatedCost = usingRental
    ? +(activeRental.pricePerCallCredits || 0.1).toFixed(2)
    : +(baseRate * activeDuration * resMultiplier).toFixed(2)

  const hasInsufficientBalance = usingRental
    ? rentalBalance < estimatedCost
    : balance < estimatedCost
  const shortfall = +(estimatedCost - (usingRental ? rentalBalance : balance)).toFixed(2)

  // When a rented video key is active, pick a matching marketplace model card
  useEffect(() => {
    if (!usingRental) return
    const p = String(activeRental.provider || '').toLowerCase()
    if (p === 'kling' && selectedModelId !== 'kling-3-0-pro') {
      setSelectedModelId('kling-3-0-pro')
    } else if ((p === 'opper' || p === 'openai') && selectedModelId !== 'opper-video') {
      setSelectedModelId('opper-video')
    } else if (p === 'gemini' && selectedModelId !== 'gemini-omni-flash') {
      setSelectedModelId('gemini-omni-flash')
    }
  }, [usingRental, activeRental, selectedModelId, setSelectedModelId])

  const handleImageUpload = (e, index = null) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (index !== null) {
        setRefImages((prev) => {
          const next = [...prev]
          next[index] = url
          return next
        })
        setRefImageFiles((prev) => {
          const next = [...prev]
          next[index] = file
          return next
        })
      } else {
        setRefImage(url)
        setRefImageFiles([file, null, null])
      }
    }
  }

  const handleFrameUpload = (e, type) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (type === 'first') {
        setFirstFrame(url)
        setFirstFrameFile(file)
      }
      if (type === 'last') {
        setLastFrame(url)
        setLastFrameFile(file)
      }
    }
  }

  const applyVeoPreset = (preset) => {
    setPrompt(preset.prompt)
    if (preset.duration) setDuration(preset.duration)
    if (preset.res && availableResolutions.includes(preset.res)) setResolution(preset.res)
  }

  const applyOmniPreset = (preset) => {
    setPrompt(preset.prompt)
    setDuration(8)
  }

  const applySoraPreset = (preset) => {
    setPrompt(preset.prompt)
    setDuration(8)
  }

  const applyOpperPreset = (preset) => {
    setPrompt(preset.prompt)
    setDuration(opperUsesSoraParams ? 4 : 6)
  }

  const fileToDataUri = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  // Opper Videos API — POST /v3/videos → poll status_url → download presigned url
  // https://docs.opper.ai/v3-api-reference/video/create-video
  const executeOpperApi = async () => {
    const key = opperKey.trim()
    const viaVault = usingRental
    if (!viaVault && !key) {
      setJobState('failed')
      setJobError('Add an Opper API key (VITE_OPPER_API_KEY) to call POST /v3/videos.')
      setShowOpperKey(true)
      return
    }

    if (opperMode === 'image' && !firstFrameFile) {
      setJobState('failed')
      setJobError('Upload a reference image for image-to-video (URL, data-URI, or file).')
      return
    }

    setJobState('in_progress')
    setJobProgress(8)
    setJobError(null)
    setJobResult(null)
    setRawApiResponse(null)

    const size = opperSizeFromUi(aspectRatio, activeResolution)
    const parameters = opperParametersFor(opperBackend, {
      seconds: activeDuration,
      aspectRatio,
      resolution: activeResolution,
      size,
    })
    const authHeaders = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }
    const logs = [
      viaVault
        ? `[Vault·Opper] rented ${activeRental.keyMasked} · ${opperBackend}`
        : `[Opper] model=${opperBackend} · mode=${opperMode} · ${activeDuration}s · ${activeResolution}`,
    ]
    setApiLogs(logs)

    try {
      const body = {
        model: opperBackend,
        prompt,
        parameters,
      }

      if (opperMode === 'image' && firstFrameFile) {
        body.image = await fileToDataUri(firstFrameFile)
        logs.push(`[image] data-URI · ${(firstFrameFile.size / 1024).toFixed(1)} KB`)
      }

      logs.push(viaVault ? `[POST] vault → /v3/videos` : `[POST] /api/opper/v3/videos`)
      setApiLogs([...logs])

      let createData
      if (viaVault) {
        const provider =
          String(activeRental.provider || 'opper').toLowerCase() === 'openai'
            ? 'openai'
            : 'opper'
        const path = provider === 'openai' ? '/v1/videos' : '/v3/videos'
        const proxied = await vaultProxy({
          listingId: activeRental.onChain ? activeRental.listingId : undefined,
          ciphertextHex: activeRental.ciphertextHex || undefined,
          provider,
          path,
          json: body,
        })
        createData = proxied.data
      } else {
        const createRes = await fetch('/api/opper/v3/videos', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(body),
        })
        createData = await createRes.json()
        if (!createRes.ok && createRes.status !== 202) {
          throw new Error(
            createData.error?.message ||
              createData.message ||
              `HTTP ${createRes.status}`
          )
        }
      }
      setRawApiResponse(createData)

      const jobId = createData.id
      let statusUrl = createData.status_url
      if (!jobId) {
        throw new Error('Missing id in Opper/OpenAI video response')
      }
      if (!statusUrl) {
        statusUrl = viaVault
          ? `/v3/artifacts/${jobId}/status`
          : `/api/opper/v3/artifacts/${jobId}/status`
      }

      if (typeof statusUrl === 'string' && statusUrl.startsWith('https://api.opper.ai')) {
        statusUrl = statusUrl.replace('https://api.opper.ai', '/api/opper')
      } else if (typeof statusUrl === 'string' && statusUrl.startsWith('http://')) {
        statusUrl = `/api/opper/v3/artifacts/${jobId}/status`
      }

      logs.push(`Job ${jobId} · polling status_url`)
      setApiLogs([...logs])
      setJobProgress(15)

      let status = { status: 'processing' }
      let attempts = 0
      while (
        status.status === 'processing' ||
        status.status === 'queued' ||
        status.status === 'pending' ||
        status.status === 'in_progress'
      ) {
        await new Promise((r) => setTimeout(r, 8000))
        attempts += 1
        if (viaVault) {
          const pollPath =
            typeof statusUrl === 'string' && statusUrl.startsWith('/')
              ? statusUrl.replace(/^\/api\/opper/, '') || `/v3/artifacts/${jobId}/status`
              : `/v3/artifacts/${jobId}/status`
          const proxied = await vaultProxy({
            listingId: activeRental.onChain ? activeRental.listingId : undefined,
            ciphertextHex: activeRental.ciphertextHex || undefined,
            provider: 'opper',
            path: pollPath,
            method: 'GET',
          })
          status = proxied.data
        } else {
          const pollRes = await fetch(statusUrl, {
            headers: { Authorization: `Bearer ${key}` },
          })
          status = await pollRes.json()
          if (!pollRes.ok) {
            throw new Error(status.error?.message || status.message || `Poll HTTP ${pollRes.status}`)
          }
        }
        setRawApiResponse(status)
        setJobProgress(Math.min(90, 15 + attempts * 8))
        logs.push(`[poll ${attempts}] status=${status.status}`)
        setApiLogs([...logs])
        if (status.status === 'failed' || status.status === 'error') {
          throw new Error(status.error?.message || status.message || 'Video job failed')
        }
        if (attempts > 40) throw new Error('Timed out waiting for video')
      }

      if (status.status === 'failed') {
        throw new Error(
          status.error?.message ||
            status.error ||
            'Opper video generation failed'
        )
      }
      if (status.status !== 'completed') {
        throw new Error(`Unexpected status: ${status.status}`)
      }
      if (!status.url) {
        throw new Error('Completed job missing download url')
      }

      // Per Opper docs: use the presigned `url` from the status poll.
      // Do NOT re-fetch into a blob in the browser — S3 blocks CORS and
      // that shows up as a failed generation even when the job succeeded.
      // https://docs.opper.ai/build/multimodal/video
      const videoUrl = status.url
      const usageSec = status.usage?.seconds
      const usageCost = status.usage?.cost

      setApiLogs((prev) => [
        ...prev,
        `✓ Completed · ${status.mime_type || 'video/mp4'}`,
        status.file_id ? `file_id=${status.file_id}` : '',
        usageSec != null ? `usage: ${usageSec}s · cost $${usageCost ?? '—'}` : '',
        `Preview URL ready (presigned, ~1h)`,
      ].filter(Boolean))
      setJobProgress(100)
      setJobState('completed')
      if (viaVault) {
        try {
          await meterCreditsOnly(activeRental.listingId)
          setLastDeduction(estimatedCost)
        } catch (meterErr) {
          logs.push(`⚠ Meter: ${meterErr.message}`)
          setApiLogs([...logs])
        }
      }
      setJobResult({
        modelName: viaVault
          ? `${activeRental.title} · rented`
          : `${selectedModel.display_name} · ${opperBackendMeta.label}`,
        prompt,
        duration: usageSec ?? activeDuration,
        resolution: activeResolution,
        aspectRatio,
        hasAudio: true,
        cost: estimatedCost,
        videoUrl,
        rawResponse: status,
        timestamp: new Date().toLocaleTimeString(),
        txHash: `${String(jobId).slice(0, 14)}…`,
        interactionId: jobId,
        fileId: status.file_id || null,
      })
    } catch (err) {
      setJobState('failed')
      setJobError(err.message || 'Opper Videos API request failed')
      setApiLogs((prev) => [...prev, `✗ ${err.message}`])
    }
  }

  // Real OpenAI Sora — Videos API (create → poll → download)
  const executeSoraApi = async () => {
    const key = openaiKey.trim()
    if (!key) {
      setJobState('failed')
      setJobError('Add an OpenAI API key (VITE_OPENAI_API_KEY) to call the Videos API.')
      setShowOpenaiKey(true)
      return
    }

    if (soraMode === 'image' && !firstFrameFile) {
      setJobState('failed')
      setJobError('Upload an input_reference image (must match output size).')
      return
    }
    if ((soraMode === 'edit' || soraMode === 'extend') && !lastSoraVideoId) {
      setJobState('failed')
      setJobError(
        'Generate a video first (or paste a video_… id) before edit / extend.'
      )
      return
    }

    setJobState('in_progress')
    setJobProgress(8)
    setJobError(null)
    setJobResult(null)
    setRawApiResponse(null)

    const size = soraSizeFromUi(aspectRatio, activeResolution, isSoraPro)
    const seconds = String(activeDuration)
    const authHeaders = { Authorization: `Bearer ${key}` }
    const logs = [
      `[Sora] model=${soraApiModel} · mode=${soraMode} · ${size} · ${seconds}s`,
    ]
    setApiLogs(logs)

    try {
      let createRes
      let createData

      if (soraMode === 'edit') {
        logs.push(`[POST] /api/openai/v1/videos/edits`)
        setApiLogs([...logs])
        createRes = await fetch('/api/openai/v1/videos/edits', {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video: { id: lastSoraVideoId },
            prompt: soraEditPrompt || prompt,
          }),
        })
      } else if (soraMode === 'extend') {
        logs.push(`[POST] /api/openai/v1/videos/extensions`)
        setApiLogs([...logs])
        createRes = await fetch('/api/openai/v1/videos/extensions', {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video: { id: lastSoraVideoId },
            prompt: prompt || 'Continue the scene.',
            seconds,
          }),
        })
      } else {
        // text or image — multipart create
        logs.push(`[POST] /api/openai/v1/videos`)
        setApiLogs([...logs])
        const form = new FormData()
        form.append('model', soraApiModel)
        form.append('prompt', prompt)
        form.append('size', size)
        form.append('seconds', seconds)
        if (soraMode === 'image' && firstFrameFile) {
          form.append('input_reference', firstFrameFile, firstFrameFile.name)
        }
        createRes = await fetch('/api/openai/v1/videos', {
          method: 'POST',
          headers: authHeaders,
          body: form,
        })
      }

      createData = await createRes.json()
      setRawApiResponse(createData)

      if (!createRes.ok) {
        throw new Error(
          createData.error?.message ||
            createData.message ||
            `HTTP ${createRes.status}`
        )
      }

      let video = createData
      logs.push(`Job ${video.id} · status ${video.status}`)
      setApiLogs([...logs])
      setJobProgress(Math.max(12, video.progress || 12))

      // Poll until completed / failed
      let attempts = 0
      while (video.status === 'queued' || video.status === 'in_progress') {
        await new Promise((r) => setTimeout(r, 2500))
        attempts += 1
        const pollRes = await fetch(`/api/openai/v1/videos/${video.id}`, {
          headers: authHeaders,
        })
        video = await pollRes.json()
        setRawApiResponse(video)
        if (!pollRes.ok) {
          throw new Error(
            video.error?.message || video.message || `Poll HTTP ${pollRes.status}`
          )
        }
        const prog = typeof video.progress === 'number' ? video.progress : null
        setJobProgress(prog != null ? Math.min(92, Math.max(15, prog)) : Math.min(90, 15 + attempts * 3))
        setApiLogs((prev) => [
          ...prev.slice(0, 8),
          `[Poll #${attempts}] ${video.status}${prog != null ? ` · ${prog}%` : ''}`,
        ])
      }

      if (video.status === 'failed') {
        throw new Error(
          video.error?.message || 'Sora job failed'
        )
      }
      if (video.status !== 'completed') {
        throw new Error(`Unexpected status: ${video.status}`)
      }

      logs.push(`Completed ${video.id} — downloading content…`)
      setApiLogs((prev) => [...prev, `✓ Completed — downloading MP4`])
      setJobProgress(94)

      const contentRes = await fetch(
        `/api/openai/v1/videos/${video.id}/content`,
        { headers: authHeaders }
      )
      if (!contentRes.ok) {
        const errText = await contentRes.text()
        throw new Error(
          `Download failed (${contentRes.status}): ${errText.slice(0, 200)}`
        )
      }
      const blob = await contentRes.blob()
      const videoUrl = URL.createObjectURL(blob)

      setLastSoraVideoId(video.id)
      setJobProgress(100)
      setJobState('completed')
      setApiLogs((prev) => [
        ...prev,
        `✓ Saved blob (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
      ])
      setJobResult({
        modelName: selectedModel.display_name,
        prompt: soraMode === 'edit' ? soraEditPrompt || prompt : prompt,
        duration: activeDuration,
        resolution: activeResolution,
        aspectRatio,
        hasAudio: true,
        cost: estimatedCost,
        videoUrl,
        rawResponse: video,
        timestamp: new Date().toLocaleTimeString(),
        txHash: `${String(video.id).slice(0, 14)}…`,
        interactionId: video.id,
      })
    } catch (err) {
      setJobState('failed')
      setJobError(err.message || 'Sora Videos API request failed')
      setApiLogs((prev) => [...prev, `✗ ${err.message}`])
    }
  }

  // Real Gemini Omni Flash — Interactions API
  const executeOmniApi = async () => {
    const key = geminiKey.trim()
    if (!key) {
      setJobState('failed')
      setJobError('Add a Gemini API key to call gemini-omni-1.1-flash.')
      setShowGeminiKey(true)
      return
    }

    setJobState('in_progress')
    setJobProgress(12)
    setJobError(null)
    setJobResult(null)
    setRawApiResponse(null)

    if (omniMode === 'image' && !firstFrameFile) {
      setJobState('failed')
      setJobError('Upload a reference image for Image → Video.')
      return
    }
    if (omniMode === 'interpolation' && (!firstFrameFile || !lastFrameFile)) {
      setJobState('failed')
      setJobError('Upload both first and last frames for interpolation.')
      return
    }
    if (omniMode === 'reference' && !refImageFiles.some(Boolean)) {
      setJobState('failed')
      setJobError('Upload at least one subject reference image.')
      return
    }
    if ((omniMode === 'edit' || omniMode === 'extend') && !previousInteractionId) {
      setJobState('failed')
      setJobError(
        'Generate a video first (or paste a previous_interaction_id) before edit / extend.'
      )
      return
    }

    const apiRes = activeResolution === '4K' ? '4k' : activeResolution
    const logs = [
      `[POST] /api/gemini/v1beta/interactions`,
      `Model: gemini-omni-1.1-flash`,
      `Mode: ${omniMode} · ${aspectRatio} · ${apiRes}`,
    ]
    setApiLogs(logs)

    try {
      let input
      let task
      let bodyExtra = {}

      if (omniMode === 'edit' && previousInteractionId) {
        input = editPrompt || prompt
        bodyExtra.previous_interaction_id = previousInteractionId
        task = 'edit'
        logs.push(`previous_interaction_id: ${previousInteractionId}`)
      } else if (omniMode === 'image' && firstFrameFile) {
        const data = await fileToBase64(firstFrameFile)
        input = [
          { type: 'image', data, mime_type: firstFrameFile.type || 'image/jpeg' },
          { type: 'text', text: prompt },
        ]
        task = 'image_to_video'
      } else if (omniMode === 'interpolation' && firstFrameFile && lastFrameFile) {
        const a = await fileToBase64(firstFrameFile)
        const b = await fileToBase64(lastFrameFile)
        input = [
          { type: 'image', data: a, mime_type: firstFrameFile.type || 'image/jpeg' },
          { type: 'image', data: b, mime_type: lastFrameFile.type || 'image/jpeg' },
          { type: 'text', text: prompt },
        ]
      } else if (omniMode === 'reference') {
        const parts = []
        for (const file of refImageFiles) {
          if (!file) continue
          const data = await fileToBase64(file)
          parts.push({ type: 'image', data, mime_type: file.type || 'image/png' })
        }
        parts.push({ type: 'text', text: prompt })
        input = parts
        task = 'reference_to_video'
      } else if (omniMode === 'extend' && previousInteractionId) {
        input = prompt || 'Continue the scene.'
        bodyExtra.previous_interaction_id = previousInteractionId
        task = 'extend'
      } else {
        input = prompt
        task = 'text_to_video'
      }

      setJobProgress(28)
      setApiLogs([...logs, `Payload input ready (${typeof input === 'string' ? 'text' : 'multimodal'})`])

      const payload = {
        model: 'gemini-omni-1.1-flash',
        input,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio,
          resolution: apiRes,
        },
        ...bodyExtra,
      }

      if (task && omniMode !== 'text' && omniMode !== 'interpolation') {
        payload.generation_config = { video_config: { task } }
      }

      const res = await fetch('/api/gemini/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      setRawApiResponse(data)
      setJobProgress(78)

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${res.status}`)
      }

      const video = extractOmniVideo(data)
      if (!video?.data && !video?.uri) {
        throw new Error('No video in Interactions response. Check steps[].content for type "video".')
      }

      let videoUrl
      if (video.data) {
        videoUrl = base64ToVideoUrl(video.data, video.mime)
      } else {
        // URI delivery — open Google-hosted file (may need key)
        videoUrl = video.uri.includes('?')
          ? `${video.uri}&key=${encodeURIComponent(key)}`
          : `${video.uri}?key=${encodeURIComponent(key)}`
      }

      if (data.id) setPreviousInteractionId(data.id)

      setJobProgress(100)
      setJobState('completed')
      setApiLogs((prev) => [
        ...prev,
        `✓ Interaction ${data.id || 'ok'} · status ${data.status || 'completed'}`,
        video.data ? 'Decoded base64 MP4 from response' : `URI delivery: ${video.uri}`,
      ])
      setJobResult({
        modelName: selectedModel.display_name,
        prompt: typeof input === 'string' ? input : prompt,
        duration: activeDuration,
        resolution: activeResolution,
        aspectRatio,
        hasAudio: true,
        cost: estimatedCost,
        videoUrl,
        rawResponse: data,
        timestamp: new Date().toLocaleTimeString(),
        txHash: data.id ? `${String(data.id).slice(0, 10)}…` : '0xomni…flash',
        interactionId: data.id || null,
      })
    } catch (err) {
      setJobState('failed')
      setJobError(err.message || 'Omni Flash request failed')
      setApiLogs((prev) => [...prev, `✗ ${err.message}`])
    }
  }

  // Real Kling API Call
  const executeKlingApi = async () => {
    const pollGeneration = ++klingPollGenerationRef.current
    const viaVault = usingRental && String(activeRental.provider || '').toLowerCase() === 'kling'
    if (!viaVault && !klingKey) {
      setJobState('failed')
      setJobError('Set VITE_KLING_API_KEY in .env to call the Kling API.')
      setApiLogs(['✗ Missing VITE_KLING_API_KEY'])
      return
    }

    setJobState('in_progress')
    setJobProgress(15)
    setApiLogs([
      viaVault
        ? `[Vault·Kling] rented ${activeRental.keyMasked}`
        : `[POST] /api/kling/generate -> https://kling3api.com/api/generate`,
      viaVault
        ? `Key stays on vault server`
        : `Authorization: Bearer ${klingKey.substring(0, 10)}...${klingKey.slice(-4)}`,
      `Payload: { type: "pro-text-to-video", prompt: "${prompt.slice(0, 45)}...", duration: ${activeDuration}, aspect_ratio: "${aspectRatio}" }`
    ])
    setRawApiResponse(null)

    try {
      let data
      if (viaVault) {
        const proxied = await vaultProxy({
          listingId: activeRental.onChain ? activeRental.listingId : undefined,
          ciphertextHex: activeRental.ciphertextHex || undefined,
          provider: 'kling',
          path: '/generate',
          json: {
            type: 'pro-text-to-video',
            prompt,
            duration: activeDuration,
            aspect_ratio: aspectRatio,
          },
        })
        data = proxied.data
      } else {
        const res = await fetch('/api/kling/generate', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${klingKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'pro-text-to-video',
            prompt,
            duration: activeDuration,
            aspect_ratio: aspectRatio,
          }),
        })
        data = await res.json()
      }
      setRawApiResponse(data)

      if (data.code === 200 && data.data?.task_id) {
        const taskId = data.data.task_id
        setApiLogs((prev) => [
          ...prev,
          `✓ Task Created Successfully: ID ${taskId}`,
          `Starting status polling…`,
        ])
        setJobProgress(40)

        const MAX_POLLS = 40
        const POLL_MS = 5000
        let attempts = 0
        let settled = false

        while (!settled && attempts < MAX_POLLS) {
          if (klingPollGenerationRef.current !== pollGeneration) return
          await new Promise((r) => setTimeout(r, POLL_MS))
          if (klingPollGenerationRef.current !== pollGeneration) return
          attempts += 1
          try {
            let sData
            if (viaVault) {
              const proxied = await vaultProxy({
                listingId: activeRental.onChain ? activeRental.listingId : undefined,
                ciphertextHex: activeRental.ciphertextHex || undefined,
                provider: 'kling',
                path: `/status?task_id=${encodeURIComponent(taskId)}`,
                method: 'GET',
              })
              sData = proxied.data
            } else {
              const sRes = await fetch(`/api/kling/status?task_id=${taskId}`, {
                headers: { Authorization: `Bearer ${klingKey.trim()}` },
              })
              sData = await sRes.json()
            }
            setApiLogs((prev) => [
              ...prev,
              `[Polling #${attempts}] Status: ${sData?.data?.status || 'PENDING'}`,
            ])

            if (sData?.data?.status === 'SUCCESS') {
              settled = true
              const response = sData.data.response
              const resultUrls = Array.isArray(response?.resultUrls)
                ? response.resultUrls
                : Array.isArray(response)
                  ? response
                  : []
              const videoUrl =
                resultUrls.find((u) => typeof u === 'string' && u.startsWith('http')) ||
                null

              if (!videoUrl) {
                setJobState('failed')
                setJobError('Kling returned SUCCESS but no resultUrls video URL.')
                setRawApiResponse(sData)
                return
              }

              if (viaVault) {
                try {
                  await meterCreditsOnly(activeRental.listingId)
                  setLastDeduction(estimatedCost)
                } catch (meterErr) {
                  setApiLogs((prev) => [...prev, `⚠ Meter: ${meterErr.message}`])
                }
              }

              setJobProgress(100)
              setJobState('completed')
              setJobResult({
                modelName: viaVault ? `${activeRental.title} · rented` : selectedModel.display_name,
                prompt,
                duration: activeDuration,
                resolution: activeResolution,
                aspectRatio,
                hasAudio: false,
                cost: estimatedCost,
                videoUrl,
                rawResponse: sData,
                timestamp: new Date().toLocaleTimeString(),
                txHash: `0x${taskId.substring(0, 8)}...fe73`,
              })
            } else if (sData?.data?.status === 'FAILED') {
              settled = true
              setJobState('failed')
              setJobError(`Kling Generation Failed: ${sData.data.error_message || 'Task failed'}`)
            } else {
              setJobProgress((p) => Math.min(95, p + 10))
            }
          } catch (pollErr) {
            console.error('Polling error:', pollErr)
            setApiLogs((prev) => [
              ...prev,
              `[Polling #${attempts}] error: ${pollErr.message || 'request failed'}`,
            ])
          }
        }

        if (klingPollGenerationRef.current !== pollGeneration) return
        if (!settled) {
          setJobState('failed')
          setJobError(`Timed out waiting for Kling video after ${MAX_POLLS} status checks.`)
          setApiLogs((prev) => [...prev, `✗ Timed out after ${MAX_POLLS} polls`])
        }
      } else {
        setJobState('failed')
        const errMsg = data.message || 'API Call Failed'
        setJobError(`Kling API returned: "${errMsg}" (code: ${data.code || '—'})`)
      }
    } catch (err) {
      setJobState('failed')
      setJobError(`Failed to connect to Kling API: ${err.message}`)
      setApiLogs((prev) => [...prev, `❌ Connection error: ${err.message}`])
    }
  }

  // Test mode: render completed MP4 video directly.
  // handleGenerate already burned estimatedCost before the failed live call.
  const handleProceedWithSampleVideo = async () => {
    setJobState('completed')
    setJobProgress(100)
    setJobResult({
      modelName: selectedModel.display_name,
      prompt,
      duration: activeDuration,
      resolution: activeResolution,
      aspectRatio,
      hasAudio: isVeo || isOmni || isSora || isOpper,
      cost: estimatedCost,
      videoUrl: '/assets/models/kling_sample.mp4',
      rawResponse: rawApiResponse || { message: 'Sample MP4 preview' },
      timestamp: new Date().toLocaleTimeString(),
      txHash: isKling ? '0x4e83d81b...c920' : isOpenSora ? '0x17c0329c...fe73' : '0x9a4f210d...be31'
    })
    setVideoModalOpen(true)
  }

  const handleGenerate = async () => {
    if (!isConnected) {
      connect()
      return
    }
    if (!usingRental && !ledgerConfigured) {
      setJobError('Credit ledger not configured. Deploy and set VITE_CREDIT_LEDGER_ADDRESS.')
      return
    }
    if (hasInsufficientBalance) {
      if (usingRental) {
        setJobError(
          `Need ${estimatedCost.toFixed(2)} rental credits (you have ${rentalBalance.toFixed(2)}). Deposit more ETH on the API market.`
        )
      } else {
        openDepositFrom()
      }
      return
    }

    try {
      setJobError(null)
      if (!usingRental) {
        setApiLogs((prev) => [
          ...prev,
          `Confirm on-chain spend of ${estimatedCost.toFixed(2)} credits…`,
        ])
        await chargeCredits(estimatedCost)
        setApiLogs((prev) => [...prev, '✓ Credits spent on-chain'])
      } else {
        setApiLogs((prev) => [
          ...prev,
          `Using rented key ${activeRental.keyMasked} via vault (meter after success)…`,
        ])
      }
    } catch (err) {
      setJobError(err?.message || 'On-chain credit spend failed.')
      setJobState('idle')
      return
    }

    if (isOpper) {
      executeOpperApi()
      return
    }

    if (isOmni) {
      executeOmniApi()
      return
    }

    if (isSora) {
      executeSoraApi()
      return
    }

    if (isKling) {
      executeKlingApi()
      return
    }

    // Standard simulated generation for Veo / OpenSora
    setJobState('in_progress')
    setJobProgress(8)
    setJobQueuePos(2)
    setJobError(null)
    setJobResult(null)

    setTimeout(() => { setJobProgress(34); setJobQueuePos(1) }, 600)
    setTimeout(() => { setJobProgress(70); setJobQueuePos(null) }, 1300)
    setTimeout(() => { setJobProgress(94) }, 1900)
    setTimeout(() => {
      if (forceFailTest) {
        setJobState('failed')
        setJobError('Something went wrong generating your video.')
      } else {
        setJobState('completed')
        setJobProgress(100)
        setJobResult({
          modelName: selectedModel.display_name,
          prompt,
          duration: activeDuration,
          resolution: activeResolution,
          aspectRatio,
          hasAudio: selectedModel.native_audio && audioEnabled,
          cost: estimatedCost,
          videoUrl: '/assets/models/kling_sample.mp4',
          timestamp: new Date().toLocaleTimeString(),
          txHash: isOpenSora
            ? '0x17c0329c...fe73'
            : isVeo
            ? '0x9a4f210d...be31'
            : `0x17c0${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
        })
      }
    }, 2500)
  }

  const handleRetry = () => {
    klingPollGenerationRef.current += 1
    setJobError(null)
    setJobState('idle')
    setForceFailTest(false)
  }

  // When generation finishes, open the video modal popup
  useEffect(() => {
    if (jobState === 'completed' && jobResult) {
      setVideoModalOpen(true)
    }
  }, [jobState, jobResult, setVideoModalOpen])

  const closeDrawer = () => {
    setPromptDrawerOpen(false)
  }

  return (
    <StudioSheet
      open={promptDrawerOpen}
      onClose={closeDrawer}
      origin={studioOrigin}
      label={`Prompt ${selectedModel.display_name}`}
    >
      <CodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        modelId={selectedModel.id}
      />

      <header className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-[1.375rem] leading-tight text-foreground">
              {selectedModel.display_name}
            </h2>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">
              {selectedModel.provider} · {selectedModel.tagline}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
              onClick={() => setShowCodeModal(true)}
              aria-label="View code"
            >
              <Code2 size={15} strokeWidth={1.75} aria-hidden />
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

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-6">
        {prompt.trim() && jobState === 'in_progress' && (
          <p className="rounded-2xl bg-foreground px-4 py-3 text-[13px] leading-relaxed text-background">
            {prompt}
          </p>
        )}

        {jobState === 'in_progress' && (
          <div className="rounded-2xl border border-border bg-secondary/70 px-4 py-4">
            <div className="flex items-start gap-3">
              <Loader2 size={18} strokeWidth={2} className="mt-0.5 shrink-0 animate-spin text-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug text-foreground">
                  {isOpper
                    ? `Generating via Opper · ${opperBackend}`
                    : isSora
                    ? `Generating via Sora · ${soraApiModel}`
                    : isOmni
                    ? 'Generating via Gemini Omni Flash'
                    : isKling
                    ? 'Generating via Kling 3.0 Pro'
                    : isVeo
                    ? 'Generating via Veo 3.1'
                    : 'Generating your video'}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {isOpper
                    ? 'Create, poll, then download the clip.'
                    : isSora
                    ? 'Create, poll, then download. This can take several minutes.'
                    : isOmni
                    ? 'Multimodal video generation in progress.'
                    : isKling
                      ? 'Live request in progress.'
                      : 'Usually 30–90 seconds.'}
                </p>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300"
                style={{ width: `${jobProgress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[12px] tabular-nums text-muted-foreground">
              <span>{selectedModel.display_name}</span>
              <span>{jobProgress}%</span>
            </div>

            {(isKling || isOmni || isSora || isOpper) && apiLogs.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl bg-foreground px-3 py-2.5 font-mono text-[11px] leading-relaxed text-background">
                <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-background/60">
                  <span>Live log</span>
                  <span>Live</span>
                </div>
                {apiLogs.map((log, i) => (
                  <div key={i} className="truncate">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {jobState === 'failed' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">Generation failed</p>
                <p className="mt-1 text-[13px] leading-relaxed">{jobError}</p>
              </div>
            </div>

            {rawApiResponse && (
              <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-white/70 px-3 py-2 font-mono text-[11px] leading-relaxed text-amber-950">
                {JSON.stringify(rawApiResponse, null, 2)}
              </pre>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full border border-amber-300 bg-white px-3.5 text-[12px] font-medium text-amber-950"
                onClick={
                  isKling && rawApiResponse?.code === 402
                    ? executeKlingApi
                    : isOpper
                      ? executeOpperApi
                      : isSora
                        ? executeSoraApi
                        : isOmni
                          ? executeOmniApi
                          : handleRetry
                }
              >
                Retry
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full border border-amber-300 bg-white px-3.5 text-[12px] font-medium text-amber-950"
                onClick={handleProceedWithSampleVideo}
              >
                Preview sample
              </button>
            </div>
          </div>
        )}

        {jobState === 'completed' && jobResult && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3">
            <p className="text-[13px] text-foreground">Video ready.</p>
            <button
              type="button"
              className="text-[13px] font-semibold text-foreground underline-offset-2 hover:underline"
              onClick={() => setVideoModalOpen(true)}
            >
              Open video
            </button>
          </div>
        )}

        {(jobState === 'idle' || jobState === 'completed') && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor={promptId} className="text-[13px] font-medium text-foreground">
                Prompt
              </label>
              <textarea
                id={promptId}
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the shot, motion, lighting, and sound."
                className="min-h-[5.5rem] w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-[3px] focus-visible:ring-ring/40"
              />
            </div>

            {(isVeo || isOmni || isSora || isOpper || isKling) && (
              <div className="flex flex-wrap gap-2">
                {isVeo &&
                  veoPrompts.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={studioChip}
                      onClick={() => applyVeoPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                {isOmni &&
                  omniPrompts.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={studioChip}
                      onClick={() => applyOmniPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                {isSora &&
                  soraPrompts.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={studioChip}
                      onClick={() => applySoraPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                {isOpper &&
                  opperPrompts.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={studioChip}
                      onClick={() => applyOpperPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                {isKling && (
                  <>
                    <button
                      type="button"
                      className={studioChip}
                      onClick={() => {
                        setPrompt('A cinematic shot of mountains at sunrise')
                        setDuration(5)
                      }}
                    >
                      Sunrise mountains
                    </button>
                    <button
                      type="button"
                      className={studioChip}
                      onClick={() => {
                        setPrompt(
                          'A hyper-realistic character walking through Tokyo neon rain in slow motion, reflections, high consistency',
                        )
                        setDuration(10)
                      }}
                    >
                      Tokyo neon
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={durationId} className="text-[13px] font-medium text-foreground">
                    Duration
                  </label>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {activeDuration}s
                  </span>
                </div>
                {isSora || (isOpper && opperUsesSoraParams) ? (
                  <div id={durationId} className="flex flex-wrap gap-2" role="group" aria-label="Duration">
                    {SORA_DURATIONS.filter((d) => d <= maxDuration).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={activeDuration === d}
                        className={cn(studioChip, activeDuration === d && studioChipOn)}
                        onClick={() => setDuration(d)}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <input
                      type="range"
                      id={durationId}
                      min={2}
                      max={maxDuration}
                      step={1}
                      value={activeDuration}
                      onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                      className="h-8 w-full accent-foreground"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>2s</span>
                      <span>
                        max {maxDuration}s
                        {isVeo && veoMode === 'extension' ? ' extended' : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p id={resolutionId} className="text-[13px] font-medium text-foreground">
                  Resolution
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby={resolutionId}>
                  {availableResolutions.map((res) => (
                    <button
                      key={res}
                      type="button"
                      aria-pressed={activeResolution === res}
                      className={cn(studioChip, activeResolution === res && studioChipOn)}
                      onClick={() => setResolution(res)}
                    >
                      {res}
                    </button>
                  ))}
                </div>
                {(activeResolution === '4K' || isSora || isOpper) && (
                  <p className="text-[12px] text-muted-foreground">
                    {activeResolution === '4K' ? '1.25× rate · ' : ''}
                    {isSora
                      ? `API ${soraSizeFromUi(aspectRatio, activeResolution, isSoraPro)}`
                      : isOpper
                        ? `size ${opperSizeFromUi(aspectRatio, activeResolution)}`
                        : `max ${maxRes}`}
                  </p>
                )}
              </div>
            </div>

            {selectedModel.native_audio && (
              <label htmlFor={audioId} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={audioId}
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  className="mt-0.5 size-4 accent-foreground"
                  disabled={isVeo || isOmni || isSora || isOpper}
                />
                <span className="min-w-0">
                  <span className="text-[13px] font-medium text-foreground">
                    Native audio
                    {(isVeo || isOmni || isSora || isOpper) && (
                      <span className="ms-2 text-[11px] font-normal text-muted-foreground">
                        Always on
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {isOpper
                      ? 'Depends on the provider routed through Opper.'
                      : isSora
                      ? 'Sora includes audio from the prompt.'
                      : isOmni
                      ? 'Omni Flash syncs audio with the clip.'
                      : isVeo
                        ? 'Veo 3.1 generates dialogue, effects, and ambience.'
                        : `Dialogue and effects from ${selectedModel.display_name}.`}
                  </span>
                </span>
              </label>
            )}

            {(isVeo || isKling || isSora || isOpper) && (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {isOpper
                  ? `Opper Videos · ${opperBackend}`
                  : isSora
                    ? `OpenAI Videos · ${soraApiModel}`
                    : isKling
                      ? klingKey
                        ? 'Kling 3.0 Pro · live generate'
                        : 'Kling 3.0 Pro · set VITE_KLING_API_KEY'
                      : 'Veo 3.1 · generateContent preview'}
                {(isSora || isOpper) && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() =>
                        isSora ? setShowOpenaiKey((v) => !v) : setShowOpperKey((v) => !v)
                      }
                    >
                      {isSora
                        ? showOpenaiKey
                          ? 'Hide key'
                          : 'Edit OpenAI key'
                        : showOpperKey
                          ? 'Hide key'
                          : 'Edit Opper key'}
                    </button>
                  </>
                )}
              </p>
            )}

            {isSora && showOpenaiKey && (
              <label className="block text-[13px] font-medium text-foreground">
                OpenAI API key
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-…"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  autoComplete="off"
                />
              </label>
            )}

            {isOpper && showOpperKey && (
              <label className="block text-[13px] font-medium text-foreground">
                Opper API key
                <input
                  type="password"
                  value={opperKey}
                  onChange={(e) => setOpperKey(e.target.value)}
                  placeholder="op-…"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  autoComplete="off"
                />
              </label>
            )}
          </div>
        )}
        </div>
      </div>

      {(jobState === 'idle' || jobState === 'completed') && (
        <div className="shrink-0 space-y-3 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
            <div className="text-muted-foreground">
              <strong className="font-semibold text-foreground">
                {estimatedCost.toFixed(2)}
              </strong>{' '}
              credits
              <span className="ms-1.5 text-[12px] text-muted-foreground/80">
                {activeDuration}s · ${baseRate.toFixed(2)}/sec
                {resMultiplier > 1 ? ` · ${resMultiplier}× res` : ''}
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground">
              Balance <strong className="font-semibold text-foreground">{balance.toFixed(2)}</strong>
            </div>
          </div>

          {hasInsufficientBalance && isConnected && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
              <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                You need {shortfall.toFixed(2)} more credits for this job.{' '}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={(e) => openDepositFrom(e.currentTarget)}
                >
                  Deposit {asset}
                </button>
              </span>
            </div>
          )}

          <button
            type="button"
            className={cn(
              'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-semibold text-background transition-opacity hover:opacity-92',
              hasInsufficientBalance && isConnected && 'bg-muted text-muted-foreground hover:opacity-100',
            )}
            onClick={() => {
              if (jobState === 'completed') {
                setJobState('idle')
                setJobResult(null)
              }
              handleGenerate()
            }}
          >
            {!isConnected
              ? 'Connect Wallet to Generate'
              : hasInsufficientBalance
              ? 'Insufficient Credits'
              : isOpper
              ? `Generate · Opper (${estimatedCost.toFixed(2)})`
              : isOmni
              ? `Generate · Omni (${estimatedCost.toFixed(2)})`
              : isSora
              ? `Generate · Sora (${estimatedCost.toFixed(2)})`
              : isKling
              ? `Generate · Kling (${estimatedCost.toFixed(2)})`
              : `Generate (${estimatedCost.toFixed(2)} Credits)`}
          </button>
        </div>
      )}
    </StudioSheet>
  )
}

/* ─────────────────────────────────────────────────────────
   Real HTML5 Video Result Player (NO DEMO PICTURES)
───────────────────────────────────────────────────────── */
function VideoResultPlayer({ jobResult, onReset }) {
  const [downloaded, setDownloaded] = useState(false)
  const [showPayload, setShowPayload] = useState(false)
  const videoRef = useRef(null)

  const isPortrait = jobResult.aspectRatio === '9:16'
  const videoSource = jobResult.videoUrl || '/assets/models/kling_sample.mp4'

  return (
    <div className={`video-result-player ${isPortrait ? 'is-portrait-layout' : ''}`}>
      {/* Header */}
      <div className="vr-header">
        <div className="vr-header-top">
          <div className="vr-success-badge">
            <span className="vr-check-icon">✓</span>
            <span>Generation Complete</span>
          </div>
          <span className="vr-tx-hash">
            {jobResult.interactionId
              ? `Interaction: ${jobResult.interactionId}`
              : `Settled: ${jobResult.txHash}`}
          </span>
        </div>
        <div className="vr-preview-title-row">
          <span className="vr-preview-title">Generated output preview▶</span>
          <div className="vr-preview-quick-badges">
            <span className="vr-quick-badge">{jobResult.resolution}</span>
            <span className="vr-quick-badge">{jobResult.duration}s</span>
            <span className="vr-quick-badge">{jobResult.aspectRatio || '16:9'}</span>
            <span className="vr-quick-badge vr-real-video-badge">HTML5 Video Stream</span>
            {jobResult.hasAudio && <span className="vr-quick-badge vr-badge-audio">🔊 Audio</span>}
          </div>
        </div>
      </div>

      {/* Real HTML5 Video Player */}
      <div className="vr-player-wrap">
        <div className={`vr-video-frame ${isPortrait ? 'is-portrait-frame' : ''}`}>
          <video
            ref={videoRef}
            src={videoSource}
            controls
            autoPlay
            loop
            playsInline
            className="vr-html5-video"
            title="Generated video output"
          />
        </div>
      </div>

      {/* Prompt and Debited Cost Meta */}
      <div className="vr-meta">
        <div className="vr-meta-left">
          <p className="vr-prompt-label">Prompt</p>
          <p className="vr-prompt-text">"{jobResult.prompt}"</p>
          {jobResult.rawResponse && (
            <button
              type="button"
              className="view-raw-payload-btn"
              onClick={() => setShowPayload((v) => !v)}
            >
              {showPayload ? '▼ Hide Raw API Payload' : '▶ View Raw API Payload'}
            </button>
          )}
        </div>
        <div className="vr-cost-block">
          <span className="vr-cost-label">Debited</span>
          <strong className="vr-cost-value">{jobResult.cost.toFixed(2)} credits</strong>
        </div>
      </div>

      {/* Raw Payload Drawer */}
      {showPayload && jobResult.rawResponse && (
        <div className="vr-payload-drawer">
          <pre>{JSON.stringify(jobResult.rawResponse, null, 2)}</pre>
        </div>
      )}

      {/* Actions */}
      <div className="vr-actions">
        <a
          href={videoSource}
          download="generated_video.mp4"
          className={`vr-action-btn vr-primary${downloaded ? ' vr-downloaded' : ''}`}
          onClick={() => setDownloaded(true)}
        >
          {downloaded ? '✓ Saved MP4' : 'Download MP4'}
        </a>
        <button type="button" className="vr-action-btn vr-secondary" onClick={onReset}>
          Generate Another
        </button>
        <button
          type="button"
          className="vr-action-btn vr-share"
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
        >
          Copy Link
        </button>
      </div>
    </div>
  )
}
