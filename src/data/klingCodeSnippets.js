export const klingCodeSnippets = {
  baseUrl: "https://kling3api.com",
  javascript: `// API Key from env — never hardcode
// Frontend: VITE_KLING_API_KEY · Node: KLING_API_KEY
const API_KEY = process.env.KLING_API_KEY || process.env.VITE_KLING_API_KEY;
const BASE_URL = "https://kling3api.com";

// 1. Generate video
const response = await fetch(\`\${BASE_URL}/api/generate\`, {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    type: "pro-text-to-video",
    prompt: "A cinematic shot of mountains at sunrise",
    duration: 5,
    aspect_ratio: "16:9"
  })
});

const { data } = await response.json();
console.log("Task created:", data.task_id);

// 2. Poll for status
const pollStatus = async (taskId) => {
  const statusResponse = await fetch(
    \`\${BASE_URL}/api/status?task_id=\${taskId}\`,
    { headers: { "Authorization": \`Bearer \${API_KEY}\` } }
  );
  const statusData = await statusResponse.json();
  
  if (statusData.data.status === "SUCCESS") {
    // response is already a parsed array of video URLs
    const videoUrl = statusData.data.response[0];
    console.log("Video URL:", videoUrl);
  } else if (statusData.data.status === "FAILED") {
    console.error("Error:", statusData.data.error_message);
  } else {
    setTimeout(() => pollStatus(taskId), 10000);
  }
};

pollStatus(data.task_id);`,

  curl: `# Key from env: export KLING_API_KEY=...  (app uses VITE_KLING_API_KEY)
curl -X POST "https://kling3api.com/api/generate" \\
  -H "Authorization: Bearer $KLING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "pro-text-to-video",
    "prompt": "A cinematic shot of mountains at sunrise",
    "duration": 5,
    "aspect_ratio": "16:9"
  }'`
}
