/**
 * Compile + deploy CreditLedger to Robinhood Testnet.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-credit-ledger.mjs
 *
 * Optional:
 *   TREASURY_ADDRESS=0x...   (defaults to deployer)
 *
 * Writes address to stdout and artifacts/credit-ledger-deployment.json
 */
import { createWalletClient, createPublicClient, http, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const robinhoodTestnet = {
  id: 46630,
  name: 'Robinhood Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
  },
}

function loadEnvFile() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = val
    }
  }
}

loadEnvFile()

const pk = (process.env.DEPLOYER_PRIVATE_KEY || process.env.VAULT_PRIVATE_KEY || '').trim()
if (!pk || !pk.startsWith('0x')) {
  console.error('Set DEPLOYER_PRIVATE_KEY (or VAULT_PRIVATE_KEY) in .env')
  process.exit(1)
}

const account = privateKeyToAccount(pk)
const treasuryRaw = (process.env.TREASURY_ADDRESS || process.env.VITE_VINCE_TREASURY || '').trim()
const treasury = treasuryRaw && isAddress(treasuryRaw) ? getAddress(treasuryRaw) : account.address

const artifactsDir = join(root, 'artifacts')
mkdirSync(artifactsDir, { recursive: true })

console.log('Compiling CreditLedger.sol…')
try {
  execSync(
    `npx --yes solc@0.8.20 --bin --abi --optimize --optimize-runs 200 -o "${artifactsDir}" "${join(root, 'contracts/CreditLedger.sol')}"`,
    { stdio: 'inherit', cwd: root }
  )
} catch {
  console.error('solc compile failed')
  process.exit(1)
}

const binPath = join(artifactsDir, 'contracts_CreditLedger_sol_CreditLedger.bin')
const abiPath = join(artifactsDir, 'contracts_CreditLedger_sol_CreditLedger.abi')
const binPathAlt = join(artifactsDir, 'CreditLedger.bin')
const abiPathAlt = join(artifactsDir, 'CreditLedger.abi')
const resolvedBin = existsSync(binPath) ? binPath : binPathAlt
const resolvedAbi = existsSync(abiPath) ? abiPath : abiPathAlt
if (!existsSync(resolvedBin) || !existsSync(resolvedAbi)) {
  console.error('Missing compile outputs in artifacts/')
  process.exit(1)
}

const bytecode = `0x${readFileSync(resolvedBin, 'utf8').trim()}`
const abi = JSON.parse(readFileSync(resolvedAbi, 'utf8'))

const transport = http(robinhoodTestnet.rpcUrls.default.http[0])
const publicClient = createPublicClient({ chain: robinhoodTestnet, transport })
const walletClient = createWalletClient({
  account,
  chain: robinhoodTestnet,
  transport,
})

const balance = await publicClient.getBalance({ address: account.address })
console.log(`Deployer: ${account.address}`)
console.log(`Treasury: ${treasury}`)
console.log(`Balance:  ${balance} wei`)
if (balance === 0n) {
  console.error('Deployer has 0 testnet ETH. Fund it on Robinhood Testnet first.')
  process.exit(1)
}

console.log('Deploying CreditLedger…')
const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [treasury],
})
console.log(`Tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
if (receipt.status !== 'success' || !receipt.contractAddress) {
  console.error('Deploy failed', receipt)
  process.exit(1)
}

const address = getAddress(receipt.contractAddress)
const out = {
  network: 'robinhood-testnet',
  chainId: robinhoodTestnet.id,
  address,
  treasury,
  deployer: account.address,
  txHash: hash,
  deployedAt: new Date().toISOString(),
}

writeFileSync(
  join(artifactsDir, 'credit-ledger-deployment.json'),
  JSON.stringify(out, null, 2)
)

console.log('\nDeployed CreditLedger')
console.log(`Address: ${address}`)
console.log('\nAdd to .env:')
console.log(`VITE_CREDIT_LEDGER_ADDRESS=${address}`)
console.log(`VITE_DEPOSIT_NETWORK=testnet`)
if (!treasuryRaw) {
  console.log(`VITE_VINCE_TREASURY=${treasury}`)
}
