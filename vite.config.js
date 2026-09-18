import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { vaultApiPlugin } from './server/vaultPlugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Expose vault private key to the Vite Node process (not the browser bundle)
  if (env.VAULT_PRIVATE_KEY) process.env.VAULT_PRIVATE_KEY = env.VAULT_PRIVATE_KEY
  if (env.VITE_API_KEY_MARKET_ADDRESS) {
    process.env.VITE_API_KEY_MARKET_ADDRESS = env.VITE_API_KEY_MARKET_ADDRESS
  }
  if (env.OPERATOR_PRIVATE_KEY) process.env.OPERATOR_PRIVATE_KEY = env.OPERATOR_PRIVATE_KEY
  if (env.DEPLOYER_PRIVATE_KEY) process.env.DEPLOYER_PRIVATE_KEY = env.DEPLOYER_PRIVATE_KEY
  if (env.VITE_ROBINHOOD_RPC) process.env.VITE_ROBINHOOD_RPC = env.VITE_ROBINHOOD_RPC

  return {
    plugins: [react(), vaultApiPlugin()],
    define: {
      global: 'globalThis',
    },
    server: {
      proxy: {
        '/api/kling': {
          target: 'https://kling3api.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/kling/, '/api'),
          secure: true,
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
          secure: true,
        },
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          secure: true,
        },
        '/api/opper': {
          target: 'https://api.opper.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/opper/, ''),
          secure: true,
        },
      },
    },
  }
})
