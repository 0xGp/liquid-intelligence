import { useChain } from './ChainContext'
import { useCreditLedger } from '../web3/CreditLedgerContext'
import { useNearLedger } from '../near/NearLedgerContext'

/** Studio credits for the chain tab. Method names stay stable for existing callers. */
export function useStudioLedger() {
  const { isNear } = useChain()
  const eth = useCreditLedger()
  const near = useNearLedger()
  return isNear ? near : eth
}
