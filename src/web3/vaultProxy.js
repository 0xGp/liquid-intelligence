/**
 * Call Vince vault proxy — decrypts rented listing key server-side and forwards
 * to the upstream provider. Raw key never reaches the browser.
 */
export async function vaultProxy({
  listingId,
  ciphertextHex,
  provider,
  path,
  method = 'POST',
  json,
  body,
  headers,
}) {
  const res = await fetch('/api/vault/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listingId,
      ciphertextHex,
      provider,
      path,
      method,
      json: json ?? body,
      headers,
    }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.error || `Vault proxy HTTP ${res.status}`)
  }
  if (!payload.ok) {
    const d = payload.data
    const msg =
      d?.error?.message ||
      d?.message ||
      d?.error ||
      (typeof d === 'string' ? d : null) ||
      `Upstream ${payload.status || res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return payload
}

export function defaultChatModelForProvider(provider) {
  switch (String(provider || '').toLowerCase()) {
    case 'openai':
      return 'gpt-4o-mini'
    case 'opper':
      return 'openai/gpt-4o-mini'
    case 'gemini':
      return 'gemini-2.0-flash'
    default:
      return 'gpt-4o-mini'
  }
}

export function chatPathForProvider(provider) {
  switch (String(provider || '').toLowerCase()) {
    case 'openai':
      return '/v1/chat/completions'
    case 'opper':
      return '/v3/compat/chat/completions'
    case 'gemini':
      return '/v1beta/openai/chat/completions'
    default:
      return '/v1/chat/completions'
  }
}
