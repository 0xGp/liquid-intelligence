export const omniCodeSnippets = {
  javascript: `import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Text → video with aspect ratio + resolution
const interaction = await ai.interactions.create({
  model: 'gemini-omni-1.1-flash',
  input: 'A marble rolling fast on a chain reaction style track, continuous smooth shot.',
  response_format: {
    type: 'video',
    aspect_ratio: '16:9', // '16:9' | '9:16'
    resolution: '1080p',  // '360p' | '720p' | '1080p' | '4k'
  },
});

if (interaction.output_video?.data) {
  fs.writeFileSync(
    'marble.mp4',
    Buffer.from(interaction.output_video.data, 'base64'),
  );
}

// Conversational edit (stateful)
const edited = await ai.interactions.create({
  model: 'gemini-omni-1.1-flash',
  previous_interaction_id: interaction.id,
  input: 'Make the marble chrome. Keep everything else the same.',
});`,

  python: `import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-1.1-flash",
    input="A marble rolling fast on a chain reaction style track, continuous smooth shot.",
    response_format={
        "type": "video",
        "aspect_ratio": "16:9",
        "resolution": "1080p",
    },
)

with open("marble.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))

# Conversational edit
edited = client.interactions.create(
    model="gemini-omni-1.1-flash",
    previous_interaction_id=interaction.id,
    input="Make the marble chrome. Keep everything else the same.",
)`,

  rest: `curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-omni-1.1-flash",
    "input": "A marble rolling fast on a chain reaction style track, continuous smooth shot.",
    "response_format": {
      "type": "video",
      "aspect_ratio": "16:9",
      "resolution": "1080p"
    }
  }'

# Image → video (REST)
# "input": [
#   {"type": "image", "data": "'"$BASE64_IMAGE"'", "mime_type": "image/jpeg"},
#   {"type": "text", "text": "turn this into realistic footage..."}
# ],
# "generation_config": { "video_config": { "task": "image_to_video" } }

# Video bytes live in steps[].content[] where type === "video"
# (output_video is SDK-only convenience)`,
}

export const omniPrompts = [
  {
    label: 'Marble track',
    prompt:
      'A marble rolling fast on a chain reaction style track, continuous smooth shot. No dialogue.',
  },
  {
    label: 'Cyberpunk city',
    prompt:
      'A futuristic city with neon lights and flying cars, cyberpunk style. Continuous unbroken shot.',
  },
  {
    label: 'Mountain drone',
    prompt:
      'A drone shot of a mountain landscape at sunrise. Mist in the valleys, warm light. No dialogue.',
  },
  {
    label: 'Cat on sill',
    prompt:
      'Continuous, unbroken handheld shot of a fluffy tabby cat sitting on a sunny windowsill. Tail twitches. Distant bird chirps. No dialogue.',
  },
]

/** Pull MP4 payload from Interactions API REST or SDK-shaped JSON. */
export function extractOmniVideo(interaction) {
  if (!interaction) return null
  if (interaction.output_video?.data || interaction.output_video?.uri) {
    return {
      data: interaction.output_video.data || null,
      uri: interaction.output_video.uri || null,
      mime: interaction.output_video.mime_type || 'video/mp4',
    }
  }
  const steps = interaction.steps || []
  for (const step of steps) {
    if (step.type !== 'model_output') continue
    for (const part of step.content || []) {
      if (part.type === 'video') {
        return {
          data: part.data || null,
          uri: part.uri || null,
          mime: part.mime_type || 'video/mp4',
        }
      }
    }
  }
  return null
}

export function base64ToVideoUrl(b64, mime = 'video/mp4') {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

export async function fileToBase64(file) {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
