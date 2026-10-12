import { DEPOSIT_CHAIN } from './tokens'

const deployed = new Set()

/** Throws unless `address` holds contract code on the deposit chain. */
export async function assertDeployed(publicClient, address, label) {
  if (!address) throw new Error(`${label} address is not set.`)
  const key = address.toLowerCase()
  if (deployed.has(key)) return
  if (!publicClient) throw new Error(`Cannot reach ${DEPOSIT_CHAIN.name} to check the ${label}.`)
  const code = await publicClient.getCode({ address })
  if (!code || code === '0x') {
    throw new Error(`${label} is not deployed on ${DEPOSIT_CHAIN.name} at ${address}. Nothing was sent.`)
  }
  deployed.add(key)
}
