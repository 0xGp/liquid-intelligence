/**
 * Server-only vault open (Node webcrypto).
 * Mirrors src/web3/vaultCrypto.js blob format.
 */
import { webcrypto } from 'node:crypto'

const subtle = webcrypto.subtle
const VERSION = 1

function b64ToBuf(b64) {
  return Buffer.from(b64, 'base64')
}

function hexToBytes(hex) {
  const h = String(hex).replace(/^0x/i, '')
  return Buffer.from(h, 'hex')
}

export async function openApiKeyServer(ciphertextBytes, pkcs8B64) {
  if (!pkcs8B64) throw new Error('Missing VAULT_PRIVATE_KEY')
  const priv = await subtle.importKey(
    'pkcs8',
    b64ToBuf(pkcs8B64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey', 'decrypt']
  )

  const bytes = Buffer.isBuffer(ciphertextBytes)
    ? ciphertextBytes
    : typeof ciphertextBytes === 'string'
      ? hexToBytes(ciphertextBytes)
      : Buffer.from(ciphertextBytes)

  if (bytes[0] !== VERSION) throw new Error(`Unsupported vault blob version ${bytes[0]}`)
  const iv = bytes.subarray(1, 13)
  const wrapLen = (bytes[13] << 8) | bytes[14]
  const wrapped = bytes.subarray(15, 15 + wrapLen)
  const cipher = bytes.subarray(15 + wrapLen)

  const aesKey = await subtle.unwrapKey(
    'raw',
    wrapped,
    priv,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipher)
  return new TextDecoder().decode(plain)
}

export { hexToBytes }
