/**
 * Vite plugin: vault decrypt-on-use + proxy (chat/video) endpoints.
 * Private key from process.env.VAULT_PRIVATE_KEY (never exposed to client).
 */
import { createPublicClient, http, isAddress, getAddress } from 'viem'
import { robinhoodTestnet } from '../src/web3/chain.js'
import { apiKeyMarketplaceAbi } from '../src/web3/apiKeyMarketplaceAbi.js'
import { openApiKeyServer } from './vaultDecrypt.js'

const UPSTREAM = {
  opper: 'https://api.opper.ai',
  openai: 'https://api.openai.com',
  kling: 'https://kling3api.com',
  gemini: 'https://generativelanguage.googleapis.com',
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}'
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function maskKey(key) {
  const k = String(key || '')
  if (k.length < 10) return '••••••••'
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

async function resolveCiphertext(body) {
  let cipherHex = body.ciphertextHex
  const listingId = body.listingId != null && body.listingId !== '' ? BigInt(body.listingId) : null
  const market = process.env.VITE_API_KEY_MARKET_ADDRESS

  if (!cipherHex && listingId != null && market) {
    const client = createPublicClient({
      chain: robinhoodTestnet,
      transport: http(
        process.env.VITE_ROBINHOOD_RPC || robinhoodTestnet.rpcUrls.default.http[0]
      ),
    })
    cipherHex = await client.readContract({
      address: getAddress(market),
      abi: apiKeyMarketplaceAbi,
      functionName: 'getCiphertext',
      args: [listingId],
    })
  }

  if (!cipherHex) {
    throw new Error(
      'Provide ciphertextHex, or listingId with VITE_API_KEY_MARKET_ADDRESS set'
    )
  }
  return { cipherHex, listingId }
}

async function decryptListingKey(body, priv) {
  const { cipherHex, listingId } = await resolveCiphertext(body)
  const apiKey = await openApiKeyServer(cipherHex, priv)
  return {
    apiKey,
    listingId: listingId != null ? listingId.toString() : null,
    keyMasked: maskKey(apiKey),
  }
}

function authHeaders(provider, apiKey) {
  if (provider === 'gemini') {
    return { 'x-goog-api-key': apiKey }
  }
  return { Authorization: `Bearer ${apiKey}` }
}

function buildUpstreamUrl(provider, path) {
  const base = UPSTREAM[provider]
  if (!base) throw new Error(`Unsupported provider: ${provider}`)
  let p = String(path || '')
  if (!p.startsWith('/')) p = `/${p}`
  if (provider === 'kling' && p.startsWith('/api/')) {
    // kling3api paths are /api/...
    return `${base}${p}`
  }
  if (provider === 'kling' && !p.startsWith('/api/')) {
    return `${base}/api${p}`
  }
  return `${base}${p}`
}

export function vaultApiPlugin() {
  return {
    name: 'vince-vault-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/vault/')) return next()

        const url = new URL(req.url, 'http://localhost')

        if (req.method === 'GET' && url.pathname === '/api/vault/health') {
          return send(res, 200, {
            ok: true,
            hasPrivateKey: Boolean(process.env.VAULT_PRIVATE_KEY),
            market: process.env.VITE_API_KEY_MARKET_ADDRESS || null,
          })
        }

        if (req.method !== 'POST') return next()

        try {
          const body = await readJson(req)
          const priv = (process.env.VAULT_PRIVATE_KEY || '').trim()
          if (!priv) {
            return send(res, 503, {
              error:
                'VAULT_PRIVATE_KEY not set on server. Run: node scripts/generate-vault-keys.mjs',
            })
          }

          if (url.pathname === '/api/vault/decrypt-use') {
            const { apiKey, listingId, keyMasked } = await decryptListingKey(body, priv)
            return send(res, 200, {
              ok: true,
              decrypted: true,
              keyMasked,
              listingId,
              renter:
                body.renter && isAddress(body.renter) ? getAddress(body.renter) : null,
              message:
                'Ciphertext decrypted in vault for this call. Raw key never leaves the server.',
            })
          }

          /**
           * Proxy a provider request using the decrypted listing key.
           * Body: { listingId|ciphertextHex, provider, path, method?, headers?, body? }
           */
          if (url.pathname === '/api/vault/proxy') {
            const provider = String(body.provider || '').toLowerCase()
            const path = body.path
            if (!provider || !path) {
              return send(res, 400, { error: 'provider and path are required' })
            }
            if (!UPSTREAM[provider]) {
              return send(res, 400, {
                error: `Unsupported provider "${provider}". Use opper|openai|kling|gemini.`,
              })
            }

            const { apiKey, listingId, keyMasked } = await decryptListingKey(body, priv)
            const method = String(body.method || 'POST').toUpperCase()
            const upstreamUrl = buildUpstreamUrl(provider, path)

            const headers = {
              Accept: 'application/json',
              ...authHeaders(provider, apiKey),
              ...(body.headers || {}),
            }

            let fetchBody
            if (method !== 'GET' && method !== 'HEAD') {
              if (body.rawBody != null) {
                fetchBody = body.rawBody
              } else if (body.json !== undefined) {
                headers['Content-Type'] = headers['Content-Type'] || 'application/json'
                fetchBody = JSON.stringify(body.json)
              } else if (body.body !== undefined) {
                headers['Content-Type'] = headers['Content-Type'] || 'application/json'
                fetchBody = JSON.stringify(body.body)
              }
            }

            // Gemini often wants key as query param for some endpoints
            let finalUrl = upstreamUrl
            if (provider === 'gemini' && !finalUrl.includes('key=')) {
              const sep = finalUrl.includes('?') ? '&' : '?'
              finalUrl = `${finalUrl}${sep}key=${encodeURIComponent(apiKey)}`
            }

            const upstream = await fetch(finalUrl, {
              method,
              headers,
              body: fetchBody,
            })

            const contentType = upstream.headers.get('content-type') || ''
            const text = await upstream.text()
            let data
            try {
              data = contentType.includes('json') ? JSON.parse(text) : { raw: text }
            } catch {
              data = { raw: text }
            }

            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('X-Vince-Vault', 'proxied')
            res.setHeader('X-Vince-Listing', listingId || '')
            res.setHeader('X-Vince-Key-Masked', keyMasked)
            return res.end(
              JSON.stringify({
                ok: upstream.ok,
                status: upstream.status,
                keyMasked,
                listingId,
                data,
              })
            )
          }

          return send(res, 404, { error: 'Unknown vault route' })
        } catch (err) {
          return send(res, 500, { error: err.message || 'Vault error' })
        }
      })
    },
  }
}
