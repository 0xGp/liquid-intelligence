import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { vaultApiPlugin } from './server/vaultPlugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VAULT_PRIVATE_KEY) process.env.VAULT_PRIVATE_KEY = env.VAULT_PRIVATE_KEY
  if (env.VITE_API_KEY_MARKET_ADDRESS) {
    process.env.VITE_API_KEY_MARKET_ADDRESS = env.VITE_API_KEY_MARKET_ADDRESS
  }
  if (env.OPERATOR_PRIVATE_KEY) process.env.OPERATOR_PRIVATE_KEY = env.OPERATOR_PRIVATE_KEY
  if (env.DEPLOYER_PRIVATE_KEY) process.env.DEPLOYER_PRIVATE_KEY = env.DEPLOYER_PRIVATE_KEY
  if (env.VITE_ROBINHOOD_RPC) process.env.VITE_ROBINHOOD_RPC = env.VITE_ROBINHOOD_RPC
  if (env.VITE_DEPOSIT_NETWORK) process.env.VITE_DEPOSIT_NETWORK = env.VITE_DEPOSIT_NETWORK

  return {
    plugins: [react(), tailwindcss(), vaultApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      global: 'globalThis',
    },
    server: {
      proxy: {
        '/api/kling': {
          target: 'https://kling3api.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/kling/, '/api'),
          secure: true,
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/gemini/, ''),
          secure: true,
        },
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/openai/, ''),
          secure: true,
        },
        '/api/opper': {
          target: 'https://api.opper.ai',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/opper/, ''),
          secure: true,
        },
      },
    },
  }
})
