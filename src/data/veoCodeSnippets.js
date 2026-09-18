export const veoCodeSnippets = {
  javascript: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const prompt = \`A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'\`;

// Start the long-running video generation operation
let operation = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt: prompt,
    config: {
      aspectRatio: "16:9", // "16:9" or "9:16"
      resolution: "1080p",  // "720p", "1080p", or "4k"
      durationSeconds: "8", // "4", "6", or "8"
    }
});

// Poll the operation status until the video is ready
while (!operation.done) {
    console.log("Waiting for video generation to complete...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({
        operation: operation,
    });
}

// Download the generated video
ai.files.download({
    file: operation.response.generatedVideos[0].video,
    downloadPath: "dialogue_example.mp4",
});
console.log("Generated video saved to dialogue_example.mp4");`,

  python: `import time
from google import genai
from google.genai import types

client = genai.Client()

prompt = """A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'"""

operation = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt=prompt,
    config=types.GenerateVideosConfig(
        aspect_ratio="16:9",
        resolution="1080p",
        duration_seconds="8",
    )
)

# Poll the operation status until the video is ready
while not operation.done:
    print("Waiting for video generation to complete...")
    time.sleep(10)
    operation = client.operations.get(operation)

# Download the generated video
generated_video = operation.response.generated_videos[0]
client.files.download(file=generated_video.video, destination="dialogue_example.mp4")
print("Generated video saved to dialogue_example.mp4")`,

  rest: `# GEMINI API Base URL
BASE_URL="https://generativelanguage.googleapis.com/v1beta"

# 1. Send request to generate video and capture operation name
operation_name=$(curl -s "\${BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -X "POST" \\
  -d '{
    "instances": [{
        "prompt": "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, \\"This must be it. That'\''s the secret code.\\" The woman looks at him and whispering excitedly, \\"What did you find?\\""
      }
    ],
    "parameters": {
      "aspectRatio": "16:9",
      "resolution": "1080p"
    }
  }' | jq -r .name)

# 2. Poll the operation status until the video is ready
while true; do
  status_response=$(curl -s -H "x-goog-api-key: $GEMINI_API_KEY" "\${BASE_URL}/\${operation_name}")
  is_done=$(echo "\${status_response}" | jq .done)

  if [ "\${is_done}" = "true" ]; then
    video_uri=$(echo "\${status_response}" | jq -r '.response.generateVideoResponse.generatedSamples[0].video.uri')
    echo "Downloading video from: \${video_uri}"
    curl -L -o dialogue_example.mp4 -H "x-goog-api-key: $GEMINI_API_KEY" "\${video_uri}"
    break
  fi
  sleep 10
done`,

  go: `package main

import (
    "context"
    "log"
    "os"
    "time"
    "google.golang.org/genai"
)

func main() {
    ctx := context.Background()
    client, err := genai.NewClient(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    prompt := "A close up of two people staring at a cryptic drawing on a wall..."

    videoConfig := &genai.GenerateVideosConfig{
        AspectRatio: "16:9",
        Resolution: "1080p",
    }

    operation, _ := client.Models.GenerateVideos(
        ctx,
        "veo-3.1-generate-preview",
        prompt,
        nil,
        videoConfig,
    )

    for !operation.Done {
        log.Println("Waiting for video generation to complete...")
        time.Sleep(10 * time.Second)
        operation, _ = client.Operations.GetVideosOperation(ctx, operation, nil)
    }

    video := operation.Response.GeneratedVideos[0]
    client.Files.Download(ctx, video.Video, nil)
    _ = os.WriteFile("dialogue_example.mp4", video.Video.VideoBytes, 0644)
    log.Println("Generated video saved to dialogue_example.mp4")
}`
}

export const veoPrompts = [
  {
    label: "Dialogue & Sound Effects",
    prompt: "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, 'This must be it. That\\'s the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'",
    category: "Dialogue",
    duration: 8,
    res: "1080p",
  },
  {
    label: "Cinematic Realism",
    prompt: "Drone shot following a classic red convertible driven by a man along a winding coastal road at sunset, waves crashing against the rocks below. The convertible accelerates fast and the engine roars loudly.",
    category: "Realism",
    duration: 8,
    res: "4K",
  },
  {
    label: "Creative Animation",
    prompt: "A whimsical stop-motion animation of a tiny robot tending to a garden of glowing mushrooms on a miniature planet with soft twinkling ambient audio.",
    category: "Animation",
    duration: 8,
    res: "1080p",
  },
  {
    label: "Portrait (9:16) Hawaiian Waterfall",
    prompt: "Create a portrait video highlighting the smooth motion of a majestic Hawaiian waterfall within a lush rainforest. Focus on realistic water flow, detailed foliage, and natural ambient waterfall sounds.",
    category: "Portrait",
    duration: 8,
    res: "1080p",
  },
]
