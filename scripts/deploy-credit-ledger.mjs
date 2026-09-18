/**
 * Compile + deploy CreditLedger to Robinhood Chain.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-credit-ledger.mjs
 *
 * Network:
 *   DEPLOY_NETWORK=mainnet|testnet  (defaults to VITE_DEPOSIT_NETWORK, then mainnet)
 *
 * Optional:
 *   TREASURY_ADDRESS=0x...   (defaults to VITE_VINCE_TREASURY, then deployer)
 *
 * Writes address to stdout and artifacts/credit-ledger-deployment.json
 */
import { createWalletClient, createPublicClient, http, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { loadEnvFile, resolveNetwork, root } from './robinhood-networks.mjs'

loadEnvFile()

const chain = resolveNetwork()

const pk = (process.env.DEPLOYER_PRIVATE_KEY || '').trim()
if (!pk || !pk.startsWith('0x')) {
  console.error('Set DEPLOYER_PRIVATE_KEY in .env (ETH key, not VAULT_PRIVATE_KEY)')
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

const transport = http(chain.rpcUrls.default.http[0])
const publicClient = createPublicClient({ chain, transport })
const walletClient = createWalletClient({
  account,
  chain,
  transport,
})

const balance = await publicClient.getBalance({ address: account.address })
console.log(`Network:  ${chain.name} (${chain.id})`)
console.log(`Deployer: ${account.address}`)
console.log(`Treasury: ${treasury}`)
console.log(`Balance:  ${balance} wei`)
if (balance === 0n) {
  console.error(`Deployer has 0 ETH on ${chain.name}. Fund ${account.address} first.`)
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
  network: chain.slug,
  chainId: chain.id,
  address,
  treasury,
  deployer: account.address,
  txHash: hash,
  deployedAt: new Date().toISOString(),
}

writeFileSync(join(artifactsDir, 'credit-ledger-deployment.json'), JSON.stringify(out, null, 2))

console.log('\nDeployed CreditLedger')
console.log(`Address: ${address}`)
console.log('\nAdd to .env:')
console.log(`VITE_CREDIT_LEDGER_ADDRESS=${address}`)
console.log(`VITE_DEPOSIT_NETWORK=${chain.envNetwork}`)
if (!treasuryRaw) {
  console.log(`VITE_VINCE_TREASURY=${treasury}`)
}
