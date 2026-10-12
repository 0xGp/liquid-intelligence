import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import {
  NEAR_CONTRACT_ID,
  NEAR_GAS,
  NEAR_NETWORK,
  viewNativeYocto,
  yoctoToNear,
} from './rpc'
import { SHOW_NEAR } from '../chain/visibility'

const NearWalletContext = createContext(null)

let connector

function getConnector() {
  if (!connector) {
    connector = new NearConnector({
      network: NEAR_NETWORK,
      autoConnect: true,
      features: {
        signAndSendTransaction: true,
        signInWithoutAddKey: true,
        testnet: NEAR_NETWORK !== 'mainnet',
      },
    })
  }
  return connector
}

export function NearWalletProvider({ children }) {
  const [accountId, setAccountId] = useState(null)
  const [nativeYocto, setNativeYocto] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const refreshNative = useCallback(async () => {
    if (!accountId) {
      setNativeYocto(null)
      return null
    }
    try {
      const yocto = await viewNativeYocto(accountId)
      setNativeYocto(yocto)
      return yocto
    } catch {
      return null
    }
  }, [accountId])

  useEffect(() => {
    if (!SHOW_NEAR) return undefined
    const current = getConnector()
    const onIn = (event) => setAccountId(event.accounts?.[0]?.accountId ?? null)
    const onOut = () => {
      setAccountId(null)
      setNativeYocto(null)
    }
    current.on('wallet:signIn', onIn)
    current.on('wallet:signOut', onOut)
    current
      .getConnectedWallet()
      .then(({ accounts }) => setAccountId(accounts?.[0]?.accountId ?? null))
      .catch(() => {})
    return () => {
      current.off('wallet:signIn', onIn)
      current.off('wallet:signOut', onOut)
    }
  }, [])

  useEffect(() => {
    refreshNative()
    if (!accountId) return undefined
    const id = window.setInterval(refreshNative, 15_000)
    return () => window.clearInterval(id)
  }, [accountId, refreshNative])

  const connect = useCallback(async () => {
    setError(null)
    setPending(true)
    try {
      const wallet = await getConnector().connect()
      const accounts = await wallet.getAccounts()
      const next = accounts?.[0]?.accountId ?? null
      setAccountId(next)
      return next
    } catch (err) {
      const message = err?.message || 'NEAR connect failed.'
      if (!/reject|cancel|closed/i.test(message)) setError(message)
      throw err
    } finally {
      setPending(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    setPending(true)
    try {
      await getConnector().disconnect()
    } catch {
      /* wallet already gone */
    } finally {
      setAccountId(null)
      setNativeYocto(null)
      setPending(false)
    }
  }, [])

  const signAndSend = useCallback(async ({ methodName, args = {}, deposit = '0' }) => {
    if (!NEAR_CONTRACT_ID) throw new Error('Set VITE_NEAR_CONTRACT_ID.')
    const wallet = await getConnector().wallet()
    const outcome = await wallet.signAndSendTransaction({
      receiverId: NEAR_CONTRACT_ID,
      actions: [
        {
          type: 'FunctionCall',
          params: {
            methodName,
            args,
            gas: NEAR_GAS,
            deposit,
          },
        },
      ],
    })
    const hash = outcome?.transaction?.hash
    return typeof hash === 'string' ? hash : hash ? String(hash) : ''
  }, [])

  const value = useMemo(
    () => ({
      accountId,
      isConnected: Boolean(accountId),
      nativeYocto,
      nativeBalance: nativeYocto == null ? null : yoctoToNear(nativeYocto),
      pending,
      error,
      connect,
      disconnect,
      signAndSend,
      refreshNative,
    }),
    [accountId, nativeYocto, pending, error, connect, disconnect, signAndSend, refreshNative],
  )

  return <NearWalletContext.Provider value={value}>{children}</NearWalletContext.Provider>
}

export function useNearWallet() {
  const ctx = useContext(NearWalletContext)
  if (!ctx) throw new Error('useNearWallet must be used within NearWalletProvider')
  return ctx
}
