export const opperCodeSnippets = {
  javascript: `// API key from env — never hardcode
const OPPER_API_KEY = process.env.OPPER_API_KEY;
const BASE = 'https://api.opper.ai';

const submit = await fetch(\`\${BASE}/v3/videos\`, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${OPPER_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/sora-2',
    prompt: 'a hot air balloon drifting over green hills at dawn',
    parameters: { seconds: '4', size: '1280x720' },
  }),
});
// 202 { id, status_url }
const job = await submit.json();

let status;
do {
  await new Promise((r) => setTimeout(r, 8000));
  const poll = await fetch(job.status_url, {
    headers: { Authorization: \`Bearer \${OPPER_API_KEY}\` },
  });
  status = await poll.json();
} while (status.status === 'processing' || status.status === 'queued');

if (status.status !== 'completed') {
  throw new Error(status.error?.message || status.status);
}

// Presigned URL — no auth header needed
const mp4 = await fetch(status.url);
const buf = Buffer.from(await mp4.arrayBuffer());
require('fs').writeFileSync('video.mp4', buf);`,

  python: `import os, time, requests

BASE = "https://api.opper.ai"
headers = {"Authorization": f"Bearer {os.environ['OPPER_API_KEY']}"}

r = requests.post(f"{BASE}/v3/videos", headers=headers, json={
    "model": "openai/sora-2",
    "prompt": "a hot air balloon drifting over green hills at dawn",
    "parameters": {"seconds": "4", "size": "1280x720"},
})
r.raise_for_status()
job = r.json()

while True:
    s = requests.get(job["status_url"], headers=headers).json()
    if s["status"] == "completed":
        open("video.mp4", "wb").write(requests.get(s["url"]).content)
        break
    if s["status"] == "failed":
        raise SystemExit(s.get("error") or "failed")
    time.sleep(8)`,

  rest: `# https://docs.opper.ai/v3-api-reference/video/create-video
# Key from env: export OPPER_API_KEY=...

curl -sX POST "https://api.opper.ai/v3/videos" \\
  -H "Authorization: Bearer $OPPER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/sora-2",
    "prompt": "a hot air balloon drifting over green hills at dawn",
    "parameters": { "seconds": "4", "size": "1280x720" }
  }'
# → 202 { "id": "gen_...", "status_url": "https://api.opper.ai/v3/artifacts/gen_.../status" }

# Poll until completed, then download the presigned url
# curl -s "$STATUS_URL" -H "Authorization: Bearer $OPPER_API_KEY"

# List models: GET /v3/videos/models
# Image-to-video: add "image": "https://..." or data-URI / file_id`,
}

export const opperPrompts = [
  {
    label: 'Hot air balloon',
    prompt: 'a hot air balloon drifting over green hills at dawn',
  },
  {
    label: 'Neon rain',
    prompt:
      'Cinematic tracking shot through neon rain-slicked city streets at night, warm reflections',
  },
  {
    label: 'Ocean drone',
    prompt:
      'Drone shot along a rocky coastline at golden hour, waves crashing, continuous smooth motion',
  },
]

/** Models Opper can route — see GET /v3/videos/models */
export const OPPER_BACKEND_MODELS = [
  {
    id: 'openai/sora-2',
    label: 'OpenAI Sora 2',
    kind: 'sora',
  },
  {
    id: 'openai/sora-2-pro',
    label: 'OpenAI Sora 2 Pro',
    kind: 'sora',
  },
  {
    id: 'xai/grok-imagine-video',
    label: 'xAI Grok Imagine',
    kind: 'grok',
  },
  {
    id: 'pruna/wan-t2v',
    label: 'Pruna Wan T2V',
    kind: 'pruna',
  },
  {
    id: 'vertexai/veo-3.1-fast-generate-001',
    label: 'Veo 3.1 Fast',
    kind: 'veo',
  },
]

export function opperSizeFromUi(aspectRatio, resolution) {
  const want1080 = resolution === '1080p' || resolution === '4K'
  if (want1080) {
    return aspectRatio === '9:16' ? '1080x1920' : '1920x1080'
  }
  return aspectRatio === '9:16' ? '720x1280' : '1280x720'
}

/** Build provider-specific parameters blob for Opper. */
export function opperParametersFor(backendId, { seconds, aspectRatio, resolution, size }) {
  if (backendId.startsWith('openai/')) {
    return { seconds: String(seconds), size }
  }
  if (backendId.startsWith('xai/') || backendId.startsWith('pruna/')) {
    return {
      duration: Number(seconds),
      aspect_ratio: aspectRatio,
      resolution: resolution === '4K' ? '1080p' : resolution,
    }
  }
  if (backendId.startsWith('vertexai/')) {
    return {
      durationSeconds: Number(seconds),
      resolution: resolution === '4K' ? '1080p' : resolution,
      generateAudio: true,
    }
  }
  return { seconds: String(seconds), size }
}
