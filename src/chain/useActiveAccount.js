import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useChain } from './ChainContext'
import { useNearWallet } from '../near/NearWalletContext'

export function useActiveAccount() {
  const { isNear, copy } = useChain()
  const eth = useAccount()
  const near = useNearWallet()
  const { openConnectModal } = useConnectModal()

  return {
    isNear,
    copy,
    isConnected: isNear ? near.isConnected : eth.isConnected,
    address: isNear ? near.accountId : eth.address,
    connect: () => (isNear ? near.connect() : openConnectModal?.()),
  }
}
