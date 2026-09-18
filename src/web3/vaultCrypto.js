/**
 * Vault crypto — seal API keys to Vince's RSA-OAEP public key (Web Crypto).
 *
 * Blob format (hex on-chain):
 *   [1 byte version=1]
 *   [12 byte IV]
 *   [2 byte wrappedKey length BE]
 *   [wrappedKey RSA-OAEP]
 *   [AES-GCM ciphertext+tag]
 *
 * Anyone can read the blob on-chain. Only the vault private key (server) can decrypt.
 */

const VERSION = 1

function b64ToBuf(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bufToB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

export function getVaultPublicKeyB64() {
  return (import.meta.env.VITE_VAULT_PUBLIC_KEY || '').trim()
}

/** True when env looks like RSA SPKI base64 (not an 0x wallet address). */
export function isVaultPublicKeyConfigured() {
  const k = getVaultPublicKeyB64()
  if (!k || k.startsWith('0x')) return false
  // SPKI for 2048-bit RSA is typically ~300+ chars of base64
  return k.length > 100 && !k.includes(' ')
}

export async function importVaultPublicKey(spkiB64) {
  const b64 = spkiB64 || getVaultPublicKeyB64()
  if (!b64) {
    throw new Error(
      'Missing VITE_VAULT_PUBLIC_KEY. Run: node scripts/generate-vault-keys.mjs'
    )
  }
  if (b64.startsWith('0x')) {
    throw new Error(
      'VITE_VAULT_PUBLIC_KEY is a wallet address. It must be the RSA public key from node scripts/generate-vault-keys.mjs'
    )
  }
  try {
    return await crypto.subtle.importKey(
      'spki',
      b64ToBuf(b64),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['wrapKey', 'encrypt']
    )
  } catch {
    throw new Error(
      'Invalid VITE_VAULT_PUBLIC_KEY. Regenerate with: node scripts/generate-vault-keys.mjs'
    )
  }
}

/** Encrypt plaintext API key → Uint8Array ciphertext for on-chain storage. */
export async function sealApiKey(plaintext, publicKeyB64) {
  const pub = await importVaultPublicKey(publicKeyB64)
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(String(plaintext))
  const cipherBuf = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)
  )
  const wrapped = new Uint8Array(
    await crypto.subtle.wrapKey('raw', aesKey, pub, { name: 'RSA-OAEP' })
  )

  const out = new Uint8Array(1 + 12 + 2 + wrapped.length + cipherBuf.length)
  let o = 0
  out[o++] = VERSION
  out.set(iv, o)
  o += 12
  out[o++] = (wrapped.length >> 8) & 0xff
  out[o++] = wrapped.length & 0xff
  out.set(wrapped, o)
  o += wrapped.length
  out.set(cipherBuf, o)
  return out
}

export function bytesToHex(bytes) {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

export function hexToBytes(hex) {
  const h = String(hex).replace(/^0x/i, '')
  if (h.length % 2) throw new Error('Invalid hex')
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** Server-side only: open sealed blob with PKCS8 private key (base64). */
export async function openApiKey(ciphertextBytes, pkcs8B64) {
  if (!pkcs8B64) throw new Error('Missing VAULT_PRIVATE_KEY')
  const priv = await crypto.subtle.importKey(
    'pkcs8',
    b64ToBuf(pkcs8B64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey', 'decrypt']
  )

  const bytes =
    ciphertextBytes instanceof Uint8Array
      ? ciphertextBytes
      : hexToBytes(ciphertextBytes)

  if (bytes[0] !== VERSION) throw new Error(`Unsupported vault blob version ${bytes[0]}`)
  const iv = bytes.slice(1, 13)
  const wrapLen = (bytes[13] << 8) | bytes[14]
  const wrapped = bytes.slice(15, 15 + wrapLen)
  const cipher = bytes.slice(15 + wrapLen)

  const aesKey = await crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    priv,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipher)
  return new TextDecoder().decode(plain)
}

export { bufToB64, b64ToBuf }
