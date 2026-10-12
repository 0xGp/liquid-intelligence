import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { keccak256, stringToHex } from 'viem'
import { wagmiConfig } from './config'
import { useChain } from '../chain/ChainContext'
import { DEPOSIT_CHAIN, depositDestination } from './tokens'
import {
  ensureSeedListings,
  loadListings,
  saveListings,
  loadRentals,
  saveRentals,
  loadUsage,
  saveUsage,
  loadClaims,
  saveClaims,
  maskApiKey,
  ethToListingCredits,
  creditsToEth,
  splitUsageEth,
  parseRentEth,
  PLATFORM_FEE_BPS,
} from './apiKeyMarket'
import {
  apiKeyMarketplaceAbi,
  creditsToMicro,
  marketplaceAddress,
  microToCredits,
} from './apiKeyMarketplaceAbi'
import { sealApiKey, bytesToHex } from './vaultCrypto'
import { explorerTx, isUserRejection, shortId } from './agents'
import { assertDeployed } from './contractGuard'

const ApiKeyMarketContext = createContext(null)

function mapOnChainListing(id, row) {
  const [
    lister,
    provider,
    kind,
    title,
    description,
    priceMicroCredits,
    ciphertextHash,
    active,
    totalCalls,
    totalMicroBilled,
  ] = row
  if (!lister || lister === '0x0000000000000000000000000000000000000000') return null
  return {
    id: String(id),
    onChainId: String(id),
    owner: lister,
    provider,
    kind,
    title,
    description,
    pricePerCallCredits: microToCredits(priceMicroCredits),
    status: active ? 'active' : 'paused',
    createdAt: Date.now(),
    keyMasked: 'sealed-on-chain',
    keyFingerprint: ciphertextHash,
    ciphertextHash,
    onChain: true,
    demo: false,
    totalCalls: Number(totalCalls),
    totalCreditsBilled: microToCredits(totalMicroBilled),
  }
}

function upsertOnChainRental(rentals, { listingId, renter, creditsRemaining }) {
  const idKey = String(listingId)
  const renterLc = String(renter).toLowerCase()
  const remaining = +Number(creditsRemaining).toFixed(6)
  const idx = rentals.findIndex(
    (r) => r.listingId === idKey && r.renter?.toLowerCase() === renterLc
  )
  if (idx >= 0) {
    return rentals.map((r, i) =>
      i === idx
        ? {
            ...r,
            creditsRemaining: remaining,
            creditsTotal: Math.max(Number(r.creditsTotal) || 0, remaining),
            onChain: true,
          }
        : r
    )
  }
  if (remaining <= 0) return rentals
  return [
    {
      id: `rnt_chain_${idKey}_${renterLc.slice(2, 10)}`,
      listingId: idKey,
      renter,
      ethDeposited: 0,
      creditsTotal: remaining,
      creditsRemaining: remaining,
      createdAt: Date.now(),
      onChain: true,
    },
    ...rentals,
  ]
}

export function ApiKeyMarketProvider({ children }) {
  const { isNear } = useChain()
  const { address, isConnected, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { sendTransactionAsync } = useSendTransaction()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: DEPOSIT_CHAIN.id })

  const market = marketplaceAddress()
  const onChainEnabled = Boolean(market)

  const [listings, setListings] = useState([])
  const [rentals, setRentals] = useState([])
  const [usage, setUsage] = useState([])
  const [claims, setClaims] = useState([])
  const [busy, setBusy] = useState(false)
  const [lastError, setLastError] = useState(null)
  const [lastTx, setLastTx] = useState(null)
  const [vaultReady, setVaultReady] = useState(null)
  /** Active rented key session for studio (chat/video) — key stays on server. */
  const [activeRental, setActiveRental] = useState(() => {
    try {
      const raw = sessionStorage.getItem('vince_active_rental')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const persistActiveRental = useCallback((session) => {
    setActiveRental(session)
    try {
      if (session) sessionStorage.setItem('vince_active_rental', JSON.stringify(session))
      else sessionStorage.removeItem('vince_active_rental')
    } catch {
      /* ignore */
    }
  }, [])

  const refreshLocal = useCallback(() => {
    setRentals(loadRentals())
    setUsage(loadUsage())
    setClaims(loadClaims())
  }, [])

  const refreshOnChain = useCallback(async () => {
    if (!market || !publicClient) {
      setListings(ensureSeedListings())
      return
    }
    try {
      const nextId = await publicClient.readContract({
        address: market,
        abi: apiKeyMarketplaceAbi,
        functionName: 'nextListingId',
      })
      const max = Number(nextId)
      const rows = []
      for (let id = 1; id < max; id++) {
        const row = await publicClient.readContract({
          address: market,
          abi: apiKeyMarketplaceAbi,
          functionName: 'getListing',
          args: [BigInt(id)],
        })
        const mapped = mapOnChainListing(id, row)
        if (mapped) rows.push(mapped)
      }
      const demos = ensureSeedListings().filter((l) => l.demo)
      setListings(rows.length ? rows.reverse() : demos)

      if (address && rows.length) {
        let nextRentals = loadRentals()
        for (const listing of rows) {
          try {
            const micro = await publicClient.readContract({
              address: market,
              abi: apiKeyMarketplaceAbi,
              functionName: 'microCredits',
              args: [BigInt(listing.onChainId), address],
            })
            nextRentals = upsertOnChainRental(nextRentals, {
              listingId: listing.onChainId,
              renter: address,
              creditsRemaining: microToCredits(micro),
            })
          } catch (syncErr) {
            console.warn('On-chain credit sync failed for listing', listing.onChainId, syncErr)
          }
        }
        saveRentals(nextRentals)
        setRentals(nextRentals)
      }
    } catch (err) {
      console.warn('On-chain listing sync failed, using local cache', err)
      setListings(ensureSeedListings())
    }
  }, [market, publicClient, address])

  const refresh = useCallback(async () => {
    refreshLocal()
    await refreshOnChain()
  }, [refreshLocal, refreshOnChain])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    fetch('/api/vault/health')
      .then((r) => r.json())
      .then((d) => setVaultReady(Boolean(d.hasPrivateKey)))
      .catch(() => setVaultReady(false))
  }, [])

  const myListings = useMemo(() => {
    if (!address) return []
    return listings.filter(
      (l) => l.owner?.toLowerCase() === address.toLowerCase() && !l.demo
    )
  }, [listings, address])

  const myRentals = useMemo(() => {
    if (!address) return []
    return rentals.filter((r) => r.renter?.toLowerCase() === address.toLowerCase())
  }, [rentals, address])

  const earningsByListing = useMemo(() => {
    const map = {}
    for (const u of usage) {
      if (!map[u.listingId]) {
        map[u.listingId] = {
          listingId: u.listingId,
          calls: 0,
          credits: 0,
          listerEth: 0,
          platformEth: 0,
          claimedEth: 0,
        }
      }
      const row = map[u.listingId]
      row.calls += 1
      row.credits += u.credits
      row.listerEth += u.listerEth
      row.platformEth += u.platformEth
    }
    for (const c of claims) {
      if (!map[c.listingId]) continue
      map[c.listingId].claimedEth += c.ethAmount
    }
    return map
  }, [usage, claims])

  const myClaimable = useMemo(() => {
    let total = 0
    const rows = []
    for (const listing of myListings) {
      const e = earningsByListing[listing.id] || {
        listerEth: 0,
        claimedEth: 0,
        calls: 0,
        credits: 0,
        platformEth: 0,
      }
      const claimable = Math.max(0, +(e.listerEth - e.claimedEth).toFixed(8))
      rows.push({ listing, ...e, claimable })
      total += claimable
    }
    return { total: +total.toFixed(8), rows }
  }, [myListings, earningsByListing])

  const ensureChain = async () => {
    if (onChainEnabled) await assertDeployed(publicClient, market, 'Key marketplace')
    if (chainId !== DEPOSIT_CHAIN.id) {
      await switchChainAsync({ chainId: DEPOSIT_CHAIN.id })
    }
  }

  const blockNearMarket = () => {
    if (!isNear) return
    throw new Error('Key listings, rents, and claims settle on Ethereum. Switch the chain tab to ETH.')
  }

  const createListing = async ({
    provider,
    kind,
    title,
    description,
    pricePerCallCredits,
    apiKey,
  }) => {
    setLastError(null)
    setLastTx(null)
    blockNearMarket()
    if (!isConnected || !address) {
      throw new Error('Connect an Ethereum wallet to list a key.')
    }
    const key = String(apiKey || '').trim()
    if (key.length < 12) throw new Error('Paste a valid API key (min 12 characters).')
    const price = Number(pricePerCallCredits)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Set a price per call in credits.')
    }

    // Seal to Vince vault public key — plaintext never goes on-chain
    let sealed
    try {
      sealed = await sealApiKey(key)
    } catch (err) {
      throw new Error(err?.message || 'Failed to seal API key with vault public key.')
    }
    const ciphertextHex = bytesToHex(sealed)
    const hash = keccak256(ciphertextHex)

    await ensureChain()

    if (onChainEnabled) {
      setBusy(true)
      try {
        const hashTx = await writeContractAsync({
          address: market,
          abi: apiKeyMarketplaceAbi,
          functionName: 'createListing',
          args: [
            provider,
            kind,
            title.trim() || `${provider} ${kind}`,
            description.trim(),
            creditsToMicro(price),
            ciphertextHex,
          ],
          chainId: DEPOSIT_CHAIN.id,
        })
        setLastTx(hashTx)
        await waitForTransactionReceipt(wagmiConfig, {
          hash: hashTx,
          chainId: DEPOSIT_CHAIN.id,
        })
        await refreshOnChain()
        return {
          id: 'pending-sync',
          title: title.trim(),
          ciphertextHash: hash,
          onChain: true,
          keyMasked: maskApiKey(key),
        }
      } catch (err) {
        if (isUserRejection(err)) {
          throw new Error('Cancelled in wallet. Listing not published.')
        }
        throw new Error(
          err?.shortMessage || err?.message || 'On-chain createListing failed.'
        )
      } finally {
        setBusy(false)
      }
    }

    // Fallback local listing still stores ONLY ciphertext (no plaintext)
    const listing = {
      id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      owner: address,
      provider,
      kind,
      title: title.trim() || `${provider} ${kind}`,
      description: description.trim(),
      pricePerCallCredits: +price.toFixed(4),
      status: 'active',
      createdAt: Date.now(),
      keyMasked: maskApiKey(key),
      keyFingerprint: hash,
      ciphertextHex,
      ciphertextHash: hash,
      onChain: false,
      demo: false,
      totalCalls: 0,
      totalCreditsBilled: 0,
    }
    const next = [listing, ...loadListings().filter((l) => !l.demo || l.id !== listing.id)]
    // strip any legacy plaintext
    const sanitized = next.map(({ _ownerKey, ...rest }) => rest)
    saveListings(sanitized)
    setListings(sanitized)
    return listing
  }

  const pauseListing = async (listingId) => {
    blockNearMarket()
    const listing = listings.find((l) => l.id === listingId)
    if (onChainEnabled && listing?.onChain) {
      await ensureChain()
      const hashTx = await writeContractAsync({
        address: market,
        abi: apiKeyMarketplaceAbi,
        functionName: 'setListingActive',
        args: [BigInt(listing.onChainId || listingId), listing.status !== 'active'],
        chainId: DEPOSIT_CHAIN.id,
      })
      setLastTx(hashTx)
      await waitForTransactionReceipt(wagmiConfig, { hash: hashTx, chainId: DEPOSIT_CHAIN.id })
      await refreshOnChain()
      return
    }
    const next = loadListings().map((l) =>
      l.id === listingId && l.owner?.toLowerCase() === address?.toLowerCase()
        ? { ...l, status: l.status === 'active' ? 'paused' : 'active' }
        : l
    )
    saveListings(next)
    setListings(next)
  }

  const rentListing = async (listingId, ethAmount) => {
    setLastError(null)
    setBusy(true)
    setLastTx(null)
    try {
      blockNearMarket()
      if (!isConnected || !address) throw new Error('Connect wallet to rent.')
      const listing = listings.find((l) => l.id === listingId || l.onChainId === listingId)
      if (!listing || listing.status !== 'active') {
        throw new Error('Listing is not available.')
      }
      const eth = Number(ethAmount)
      if (!Number.isFinite(eth) || eth < 0.001) {
        throw new Error('Deposit at least 0.001 ETH to rent credits.')
      }

      await ensureChain()

      if (onChainEnabled && listing.onChain) {
        const hash = await writeContractAsync({
          address: market,
          abi: apiKeyMarketplaceAbi,
          functionName: 'deposit',
          args: [BigInt(listing.onChainId || listingId)],
          value: parseRentEth(eth),
          chainId: DEPOSIT_CHAIN.id,
        })
        setLastTx(hash)
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId: DEPOSIT_CHAIN.id })
        let credits = ethToListingCredits(eth)
        if (publicClient) {
          try {
            const micro = await publicClient.readContract({
              address: market,
              abi: apiKeyMarketplaceAbi,
              functionName: 'microCredits',
              args: [BigInt(listing.onChainId || listingId), address],
            })
            credits = +microToCredits(micro).toFixed(6)
          } catch (readErr) {
            console.warn('Could not read on-chain microCredits after deposit', readErr)
          }
        }
        const idKey = String(listing.onChainId || listingId)
        let nextRentals = upsertOnChainRental(loadRentals(), {
          listingId: idKey,
          renter: address,
          creditsRemaining: credits,
        })
        nextRentals = nextRentals.map((r) =>
          r.listingId === idKey && r.renter?.toLowerCase() === address.toLowerCase()
            ? {
                ...r,
                ethDeposited: +(Number(r.ethDeposited) || 0) + eth,
                creditsTotal: credits,
                txHash: hash,
                onChain: true,
              }
            : r
        )
        const rental =
          nextRentals.find(
            (r) =>
              r.listingId === idKey && r.renter?.toLowerCase() === address.toLowerCase()
          ) || {
            id: `rnt_${Date.now().toString(36)}`,
            listingId: idKey,
            renter: address,
            ethDeposited: eth,
            creditsTotal: credits,
            creditsRemaining: credits,
            txHash: hash,
            createdAt: Date.now(),
            onChain: true,
          }
        saveRentals(nextRentals)
        setRentals(nextRentals)
        return rental
      }

      const destination = depositDestination(address)
      if (!destination) throw new Error('No treasury address configured.')
      const value = parseRentEth(eth)
      const hash = await sendTransactionAsync({
        to: destination,
        value,
        data: stringToHex(`VINCE KEY RENT ${listingId}`),
        chainId: DEPOSIT_CHAIN.id,
      })
      setLastTx(hash)
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: DEPOSIT_CHAIN.id })
      const credits = ethToListingCredits(eth)
      const rental = {
        id: `rnt_${Date.now().toString(36)}`,
        listingId,
        renter: address,
        ethDeposited: eth,
        creditsTotal: credits,
        creditsRemaining: credits,
        txHash: hash,
        createdAt: Date.now(),
      }
      const nextRentals = [rental, ...loadRentals()]
      saveRentals(nextRentals)
      setRentals(nextRentals)
      return rental
    } catch (err) {
      if (isUserRejection(err)) {
        setLastError('Cancelled in wallet. Nothing was deposited.')
      } else {
        setLastError(err?.shortMessage || err?.message || 'Rent failed.')
      }
      throw err
    } finally {
      setBusy(false)
    }
  }

  /**
   * Operator `meterUsage` on-chain, then overwrite local remaining from chain.
   */
  const meterOnChainCredits = async (listing) => {
    const idKey = String(listing.onChainId || listing.id)
    const res = await fetch('/api/vault/meter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: idKey, renter: address }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'On-chain meterUsage failed.')
    }
    const remaining = +Number(data.creditsRemaining ?? 0).toFixed(6)
    const nextRentals = upsertOnChainRental(loadRentals(), {
      listingId: idKey,
      renter: address,
      creditsRemaining: remaining,
    })
    saveRentals(nextRentals)
    setRentals(nextRentals)

    const cost =
      data.creditsBurned != null ? Number(data.creditsBurned) : listing.pricePerCallCredits
    const ethBurned = creditsToEth(cost)
    const { platform, lister } = splitUsageEth(ethBurned)
    const event = {
      id: `use_${Date.now().toString(36)}`,
      listingId: idKey,
      rentalId: idKey,
      renter: address,
      owner: listing.owner,
      credits: cost,
      ethBurned,
      platformEth: platform,
      listerEth: lister,
      createdAt: Date.now(),
      keyMasked: listing.keyMasked || 'sealed-on-chain',
      txHash: data.txHash || null,
      onChain: true,
    }
    const nextUsage = [event, ...loadUsage()]
    saveUsage(nextUsage)
    setUsage(nextUsage)
    if (data.txHash) setLastTx(data.txHash)
    await refreshOnChain()
    return event
  }

  /**
   * Use listing: vault reads on-chain ciphertext → decrypts with private key →
   * confirms decrypt (upstream call would happen here) → meters credits.
   * Raw key never returns to the browser.
   */
  const meterUsage = async (listingId) => {
    setLastError(null)
    if (!address) throw new Error('Connect wallet.')
    const listing = listings.find((l) => l.id === listingId || l.onChainId === listingId)
    if (!listing) throw new Error('Listing not found.')

    if (listing.onChain && onChainEnabled) {
      const vaultBody = {
        listingId: listing.onChainId,
        ciphertextHex: listing.ciphertextHex || undefined,
        renter: address,
      }
      const vaultRes = await fetch('/api/vault/decrypt-use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultBody),
      })
      const vaultData = await vaultRes.json()
      if (!vaultRes.ok || !vaultData.decrypted) {
        throw new Error(
          vaultData.error ||
            'Vault could not decrypt on-chain ciphertext. Check VAULT_PRIVATE_KEY / listing.'
        )
      }
      const event = await meterOnChainCredits(listing)
      return {
        ...event,
        keyMasked: vaultData.keyMasked || event.keyMasked,
        vaultMessage: vaultData.message,
      }
    }

    const idKey = String(listing.onChainId || listing.id)
    const rental = loadRentals().find(
      (r) =>
        r.listingId === idKey &&
        r.renter?.toLowerCase() === address.toLowerCase() &&
        r.creditsRemaining > 0
    )
    if (!rental) {
      throw new Error('Deposit ETH to rent credits on this key first.')
    }

    const cost = listing.pricePerCallCredits
    if (rental.creditsRemaining < cost) {
      throw new Error(
        `Need ${cost} credits on this rental (you have ${rental.creditsRemaining}). Deposit more ETH.`
      )
    }

    const vaultBody = {
      listingId: listing.onChain ? listing.onChainId : undefined,
      ciphertextHex: listing.ciphertextHex || undefined,
      renter: address,
    }
    const vaultRes = await fetch('/api/vault/decrypt-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vaultBody),
    })
    const vaultData = await vaultRes.json()
    if (!vaultRes.ok || !vaultData.decrypted) {
      throw new Error(
        vaultData.error ||
          'Vault could not decrypt on-chain ciphertext. Check VAULT_PRIVATE_KEY / listing.'
      )
    }

    const ethBurned = creditsToEth(cost)
    const { platform, lister } = splitUsageEth(ethBurned)

    const nextRentals = loadRentals().map((r) =>
      r.id === rental.id
        ? { ...r, creditsRemaining: +(r.creditsRemaining - cost).toFixed(2) }
        : r
    )
    saveRentals(nextRentals)
    setRentals(nextRentals)

    const event = {
      id: `use_${Date.now().toString(36)}`,
      listingId: idKey,
      rentalId: rental.id,
      renter: address,
      owner: listing.owner,
      credits: cost,
      ethBurned,
      platformEth: platform,
      listerEth: lister,
      createdAt: Date.now(),
      keyMasked: vaultData.keyMasked,
      vaultMessage: vaultData.message,
    }
    const nextUsage = [event, ...loadUsage()]
    saveUsage(nextUsage)
    setUsage(nextUsage)

    const nextListings = loadListings().map((l) =>
      l.id === listing.id
        ? {
            ...l,
            totalCalls: (l.totalCalls || 0) + 1,
            totalCreditsBilled: +((l.totalCreditsBilled || 0) + cost).toFixed(2),
          }
        : l
    )
    saveListings(nextListings)
    setListings((prev) =>
      prev.map((l) => nextListings.find((n) => n.id === l.id) || l)
    )

    return event
  }

  /**
   * Burn rental credits after a successful vault-proxied call (no decrypt).
   * On-chain listings call marketplace `meterUsage` so escrow becomes claimable.
   */
  const meterCreditsOnly = async (listingId) => {
    if (!address) throw new Error('Connect wallet.')
    const listing = listings.find((l) => l.id === listingId || l.onChainId === listingId)
    if (!listing) throw new Error('Listing not found.')
    if (listing.onChain && onChainEnabled) {
      return meterOnChainCredits(listing)
    }
    const idKey = String(listing.onChainId || listing.id)
    const rental = loadRentals().find(
      (r) =>
        r.listingId === idKey &&
        r.renter?.toLowerCase() === address.toLowerCase() &&
        r.creditsRemaining > 0
    )
    if (!rental) throw new Error('No rental credits on this key. Deposit ETH first.')
    const cost = listing.pricePerCallCredits
    if (rental.creditsRemaining < cost) {
      throw new Error(
        `Need ${cost} credits on this rental (you have ${rental.creditsRemaining}).`
      )
    }

    const ethBurned = creditsToEth(cost)
    const { platform, lister } = splitUsageEth(ethBurned)
    const nextRentals = loadRentals().map((r) =>
      r.id === rental.id
        ? { ...r, creditsRemaining: +(r.creditsRemaining - cost).toFixed(2) }
        : r
    )
    saveRentals(nextRentals)
    setRentals(nextRentals)

    const event = {
      id: `use_${Date.now().toString(36)}`,
      listingId: idKey,
      rentalId: rental.id,
      renter: address,
      owner: listing.owner,
      credits: cost,
      ethBurned,
      platformEth: platform,
      listerEth: lister,
      createdAt: Date.now(),
      keyMasked: listing.keyMasked || 'sealed-on-chain',
    }
    const nextUsage = [event, ...loadUsage()]
    saveUsage(nextUsage)
    setUsage(nextUsage)
    return event
  }

  /**
   * Unlock studio with a rented listing: vault decrypt check → set session →
   * navigate to marketplace chat or video.
   */
  const openStudio = async (listingId) => {
    setLastError(null)
    blockNearMarket()
    if (!address) throw new Error('Connect wallet.')
    const listing = listings.find((l) => l.id === listingId || l.onChainId === listingId)
    if (!listing) throw new Error('Listing not found.')
    if (listing.demo) throw new Error('Sample listings cannot open the studio.')

    const idKey = String(listing.onChainId || listing.id)
    if (listing.onChain && onChainEnabled && publicClient && market) {
      const micro = await publicClient.readContract({
        address: market,
        abi: apiKeyMarketplaceAbi,
        functionName: 'microCredits',
        args: [BigInt(listing.onChainId), address],
      })
      if (micro === 0n) {
        throw new Error('Deposit ETH to rent credits on this key first.')
      }
      const nextRentals = upsertOnChainRental(loadRentals(), {
        listingId: idKey,
        renter: address,
        creditsRemaining: microToCredits(micro),
      })
      saveRentals(nextRentals)
      setRentals(nextRentals)
    } else {
      const rental = loadRentals().find(
        (r) =>
          r.listingId === idKey &&
          r.renter?.toLowerCase() === address.toLowerCase() &&
          r.creditsRemaining > 0
      )
      if (!rental) {
        throw new Error('Deposit ETH to rent credits on this key first.')
      }
    }

    // Smoke-test decrypt so the studio only opens if the vault can unlock the key
    const vaultBody = {
      listingId: listing.onChain ? listing.onChainId : undefined,
      ciphertextHex: listing.ciphertextHex || undefined,
      renter: address,
    }
    const vaultRes = await fetch('/api/vault/decrypt-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vaultBody),
    })
    const vaultData = await vaultRes.json()
    if (!vaultRes.ok || !vaultData.decrypted) {
      throw new Error(
        vaultData.error ||
          'Vault could not decrypt this listing. Check VAULT_PRIVATE_KEY matches the seal key.'
      )
    }

    const kind = listing.kind === 'video' || listing.kind === 'image' ? 'video' : 'chat'
    const session = {
      listingId: idKey,
      onChainId: listing.onChainId || null,
      ciphertextHex: listing.ciphertextHex || null,
      onChain: Boolean(listing.onChain),
      provider: listing.provider,
      kind: listing.kind,
      studio: kind,
      title: listing.title,
      keyMasked: vaultData.keyMasked || listing.keyMasked,
      pricePerCallCredits: listing.pricePerCallCredits,
      openedAt: Date.now(),
    }
    persistActiveRental(session)

    if (kind === 'chat') {
      window.location.hash = '#marketplace'
      // marketplace tab is set by consumer via event / storage; dispatch custom event
      window.dispatchEvent(
        new CustomEvent('vince:open-studio', { detail: { studio: 'chat', session } })
      )
    } else {
      window.location.hash = '#marketplace'
      window.dispatchEvent(
        new CustomEvent('vince:open-studio', { detail: { studio: 'video', session } })
      )
    }

    return session
  }

  const clearStudio = () => persistActiveRental(null)

  const claimEarnings = async (listingId) => {
    setLastError(null)
    setBusy(true)
    setLastTx(null)
    try {
      blockNearMarket()
      if (!address) throw new Error('Connect wallet.')
      const listing = listings.find((l) => l.id === listingId || l.onChainId === listingId)
      await ensureChain()

      if (onChainEnabled && listing?.onChain) {
        const hash = await writeContractAsync({
          address: market,
          abi: apiKeyMarketplaceAbi,
          functionName: 'claim',
          args: [BigInt(listing.onChainId || listingId)],
          chainId: DEPOSIT_CHAIN.id,
        })
        setLastTx(hash)
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId: DEPOSIT_CHAIN.id })
        const claim = {
          id: `clm_${Date.now().toString(36)}`,
          listingId: String(listing.onChainId || listingId),
          owner: address,
          ethAmount: 0,
          txHash: hash,
          createdAt: Date.now(),
          note: 'On-chain claim executed from marketplace escrow.',
        }
        const nextClaims = [claim, ...loadClaims()]
        saveClaims(nextClaims)
        setClaims(nextClaims)
        return claim
      }

      const row = myClaimable.rows.find((r) => r.listing.id === listingId)
      if (!row || row.claimable <= 0) throw new Error('Nothing to claim.')
      const destination = depositDestination(address)
      if (!destination) throw new Error('No treasury configured.')
      const hash = await sendTransactionAsync({
        to: destination,
        value: 0n,
        data: stringToHex(
          `VINCE KEY CLAIM ${listingId} ${row.claimable}ETH → ${shortId(address)}`
        ),
        chainId: DEPOSIT_CHAIN.id,
      })
      setLastTx(hash)
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: DEPOSIT_CHAIN.id })
      const claim = {
        id: `clm_${Date.now().toString(36)}`,
        listingId,
        owner: address,
        ethAmount: row.claimable,
        txHash: hash,
        createdAt: Date.now(),
        note: 'Claim recorded (local ledger). Deploy marketplace for escrow claim.',
      }
      const nextClaims = [claim, ...loadClaims()]
      saveClaims(nextClaims)
      setClaims(nextClaims)
      return claim
    } catch (err) {
      if (isUserRejection(err)) {
        setLastError('Cancelled in wallet. Claim not recorded.')
      } else {
        setLastError(err?.shortMessage || err?.message || 'Claim failed.')
      }
      throw err
    } finally {
      setBusy(false)
    }
  }

  const rentalForListing = (listingId) => {
    if (!address) return null
    const id = String(listingId)
    return (
      rentals.find(
        (r) =>
          r.listingId === id &&
          r.renter?.toLowerCase() === address.toLowerCase() &&
          r.creditsRemaining > 0
      ) ||
      rentals.find(
        (r) =>
          r.listingId === id && r.renter?.toLowerCase() === address.toLowerCase()
      ) ||
      null
    )
  }

  const txUrl = lastTx ? explorerTx(DEPOSIT_CHAIN, lastTx) : null

  const value = {
    listings: listings.filter((l) => l.status !== 'removed'),
    myListings,
    myRentals,
    usage,
    claims,
    myClaimable,
    earningsByListing,
    busy,
    lastError,
    setLastError,
    lastTx,
    txUrl,
    platformFeeBps: PLATFORM_FEE_BPS,
    onChainEnabled,
    marketAddress: market,
    vaultReady,
    activeRental: isNear ? null : activeRental,
    createListing,
    pauseListing,
    rentListing,
    meterUsage,
    meterCreditsOnly,
    openStudio,
    clearStudio,
    claimEarnings,
    rentalForListing,
    refresh,
    isConnected,
    address,
  }

  return (
    <ApiKeyMarketContext.Provider value={value}>
      {children}
    </ApiKeyMarketContext.Provider>
  )
}

export function useApiKeyMarket() {
  const ctx = useContext(ApiKeyMarketContext)
  if (!ctx) {
    throw new Error('useApiKeyMarket must be used within ApiKeyMarketProvider')
  }
  return ctx
}
