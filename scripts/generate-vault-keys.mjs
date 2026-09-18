/**
 * Generate Vince vault RSA-OAEP keypair for sealing API keys.
 *
 * Usage: node scripts/generate-vault-keys.mjs
 * Put public key in .env as VITE_VAULT_PUBLIC_KEY (safe for client).
 * Put private key in .env as VAULT_PRIVATE_KEY (server only — never VITE_).
 */
import { webcrypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const subtle = webcrypto.subtle

function bufToB64(buf) {
  return Buffer.from(buf).toString('base64')
}

const pair = await subtle.generateKey(
  {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
)

const spki = await subtle.exportKey('spki', pair.publicKey)
const pkcs8 = await subtle.exportKey('pkcs8', pair.privateKey)

const pub = bufToB64(spki)
const priv = bufToB64(pkcs8)

const snippet = `# Vince vault keys (API key marketplace)
# Public — safe in the client bundle
VITE_VAULT_PUBLIC_KEY=${pub}

# Private — SERVER ONLY. Never prefix with VITE_. Used by /api/vault/* to decrypt on use.
VAULT_PRIVATE_KEY=${priv}
`

writeFileSync('vault-keys.env.snippet', snippet)
console.log('Wrote vault-keys.env.snippet')
console.log('\nAdd these to your .env (private key must NOT use VITE_ prefix):\n')
console.log(snippet)
console.log(
  'Ciphertext is stored on-chain. Only this private key can decrypt when a renter calls Use.'
)
