/**
 * Compile + deploy ApiKeyMarketplace (Ethereum mainnet by default).
 *
 * Usage:
 *   node scripts/deploy-api-key-market.mjs
 *
 * Network:
 *   DEPLOY_NETWORK=ethereum|robinhood|robinhood-testnet  (defaults to ethereum)
 *
 * Uses DEPLOYER_PRIVATE_KEY from .env.
 * Treasury defaults to VITE_VINCE_TREASURY, then deployer.
 *
 * Writes artifacts/api-key-market-<network>.json
 */
import { createWalletClient, createPublicClient, http, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { loadEnvFile, resolveNetwork, root } from './networks.mjs'

loadEnvFile()

const chain = resolveNetwork()

const pk = (process.env.DEPLOYER_PRIVATE_KEY || '').trim()
if (!pk || !pk.startsWith('0x')) {
  console.error('Set DEPLOYER_PRIVATE_KEY in .env (ETH key, not VAULT_PRIVATE_KEY)')
  process.exit(1)
}

const account = privateKeyToAccount(pk)

function pickAddress(...candidates) {
  for (const c of candidates) {
    const raw = (c || '').trim()
    if (raw && isAddress(raw)) return getAddress(raw)
  }
  return null
}

const treasury =
  pickAddress(process.env.TREASURY_ADDRESS, process.env.VITE_VINCE_TREASURY) || account.address

const operator = pickAddress(process.env.OPERATOR_ADDRESS) || account.address

const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || 1000)

const artifactsDir = join(root, 'artifacts')
mkdirSync(artifactsDir, { recursive: true })

console.log('Compiling ApiKeyMarketplace.sol…')
try {
  execSync(
    `npx --yes solc@0.8.20 --bin --abi --optimize --optimize-runs 200 -o "${artifactsDir}" "${join(root, 'contracts/ApiKeyMarketplace.sol')}"`,
    { stdio: 'inherit', cwd: root }
  )
} catch {
  console.error('solc compile failed')
  process.exit(1)
}

const binPath = join(artifactsDir, 'contracts_ApiKeyMarketplace_sol_ApiKeyMarketplace.bin')
const abiPath = join(artifactsDir, 'contracts_ApiKeyMarketplace_sol_ApiKeyMarketplace.abi')
const binPathAlt = join(artifactsDir, 'ApiKeyMarketplace.bin')
const abiPathAlt = join(artifactsDir, 'ApiKeyMarketplace.abi')
const resolvedBin = existsSync(binPath) ? binPath : binPathAlt
const resolvedAbi = existsSync(abiPath) ? abiPath : abiPathAlt
if (!existsSync(resolvedBin) || !existsSync(resolvedAbi)) {
  console.error('Missing compile outputs in artifacts/')
  process.exit(1)
}

const bytecode = `0x${readFileSync(resolvedBin, 'utf8').trim()}`
const abi = JSON.parse(readFileSync(resolvedAbi, 'utf8'))

const transport = http(chain.rpcUrls.default.http[0])
const publicClient = createPublicClient({ chain, transport })
const walletClient = createWalletClient({
  account,
  chain,
  transport,
})

const balance = await publicClient.getBalance({ address: account.address })
console.log(`Network:   ${chain.name} (${chain.id})`)
console.log(`Deployer:  ${account.address}`)
console.log(`Treasury:  ${treasury}`)
console.log(`Operator:  ${operator}`)
console.log(`Fee bps:   ${platformFeeBps}`)
console.log(`Balance:   ${balance} wei`)
if (balance === 0n) {
  console.error(`Deployer has 0 ETH on ${chain.name}. Fund ${account.address} first.`)
  process.exit(1)
}

console.log('Deploying ApiKeyMarketplace…')
const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [treasury, operator, platformFeeBps],
})
console.log(`Tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
if (receipt.status !== 'success' || !receipt.contractAddress) {
  console.error('Deploy failed', receipt)
  process.exit(1)
}

const address = getAddress(receipt.contractAddress)
const out = {
  network: chain.slug,
  chainId: chain.id,
  address,
  treasury,
  operator,
  platformFeeBps,
  deployer: account.address,
  txHash: hash,
  deployedAt: new Date().toISOString(),
}

writeFileSync(join(artifactsDir, `api-key-market-${chain.slug}.json`), JSON.stringify(out, null, 2))

console.log('\nDeployed ApiKeyMarketplace')
console.log(`Address: ${address}`)
console.log('\nAdd to .env:')
console.log(`VITE_API_KEY_MARKET_ADDRESS=${address}`)
console.log(`VITE_DEPOSIT_NETWORK=${chain.envNetwork}`)
