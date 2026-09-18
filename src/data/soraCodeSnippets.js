export const soraCodeSnippets = {
  javascript: `import OpenAI from "openai";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// API key from env — never hardcode
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let video = await openai.videos.create({
  model: "sora-2", // or "sora-2-pro"
  prompt: "Wide tracking shot of a teal coupe on a desert highway, heat ripples, hard sun.",
  size: "1280x720",
  seconds: "8",
});

while (video.status === "queued" || video.status === "in_progress") {
  await sleep(2000);
  video = await openai.videos.retrieve(video.id);
  console.log(video.status, video.progress ?? 0);
}

if (video.status !== "completed") {
  throw new Error(video.error?.message || \`Job failed: \${video.status}\`);
}

const content = await openai.videos.downloadContent(video.id);
writeFileSync("video.mp4", Buffer.from(await content.arrayBuffer()));`,

  python: `from openai import OpenAI
import time

# API key from env — never hardcode
client = OpenAI()  # reads OPENAI_API_KEY

video = client.videos.create(
    model="sora-2",
    prompt="Wide tracking shot of a teal coupe on a desert highway, heat ripples, hard sun.",
    size="1280x720",
    seconds="8",
)

while video.status in ("queued", "in_progress"):
    time.sleep(2)
    video = client.videos.retrieve(video.id)
    print(video.status, getattr(video, "progress", 0))

if video.status != "completed":
    raise RuntimeError(getattr(getattr(video, "error", None), "message", video.status))

content = client.videos.download_content(video.id, variant="video")
content.write_to_file("video.mp4")`,

  rest: `# Key from env: export OPENAI_API_KEY=sk-...

# 1) Create job
curl -X POST "https://api.openai.com/v1/videos" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F prompt="Wide tracking shot of a teal coupe on a desert highway." \\
  -F model="sora-2" \\
  -F size="1280x720" \\
  -F seconds="8"

# 2) Poll until completed
# curl "https://api.openai.com/v1/videos/$VIDEO_ID" \\
#   -H "Authorization: Bearer $OPENAI_API_KEY"

# 3) Download MP4
# curl -L "https://api.openai.com/v1/videos/$VIDEO_ID/content" \\
#   -H "Authorization: Bearer $OPENAI_API_KEY" \\
#   --output video.mp4

# Image reference (first frame):
# -F input_reference="@frame.jpeg;type=image/jpeg"

# Extend:
# POST /v1/videos/extensions  { "video": { "id": "video_..." }, "prompt": "...", "seconds": "8" }

# Edit:
# POST /v1/videos/edits  { "video": { "id": "video_..." }, "prompt": "Change the palette to teal..." }`,
}

export const soraPrompts = [
  {
    label: 'Desert coupe',
    prompt:
      'Wide tracking shot of a teal coupe driving through a desert highway, heat ripples visible, hard sun overhead.',
  },
  {
    label: 'Sparkling thank you',
    prompt: "A video of the words 'Thank you' in sparkling letters against a soft bokeh night sky.",
  },
  {
    label: 'Coffee close-up',
    prompt:
      'Close-up of a steaming coffee cup on a wooden table, morning light through blinds, soft depth of field.',
  },
  {
    label: 'Red kite',
    prompt:
      'Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward.',
  },
]

/** Map UI aspect + resolution → Videos API size string */
export function soraSizeFromUi(aspectRatio, resolution, isPro) {
  const want1080 = resolution === '1080p' || resolution === '4K'
  if (isPro && want1080) {
    return aspectRatio === '9:16' ? '1080x1920' : '1920x1080'
  }
  // sora-2 / 720p default
  if (aspectRatio === '9:16') return '720x1280'
  return '1280x720'
}

/** Snap duration to allowed Sora lengths (API expects string seconds). */
export const SORA_DURATIONS = [4, 8, 12, 16, 20]

export function snapSoraDuration(seconds) {
  const n = Number(seconds) || 8
  return SORA_DURATIONS.reduce((best, d) =>
    Math.abs(d - n) < Math.abs(best - n) ? d : best
  )
}
