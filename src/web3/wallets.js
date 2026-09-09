import { getWalletConnectConnector } from '@rainbow-me/rainbowkit'

const ICON = '/assets/robinhood-wallet.svg'

/** Robinhood Wallet via WalletConnect — scan from the Robinhood app. */
export const robinhoodWallet = ({ projectId }) => ({
  id: 'robinhood',
  name: 'Robinhood',
  shortName: 'Robinhood',
  iconUrl: ICON,
  iconBackground: '#00C805',
  iconAccent: '#00C805',
  downloadUrls: {
    android: 'https://play.google.com/store/apps/details?id=com.robinhood.android',
    ios: 'https://apps.apple.com/app/robinhood/id938003185',
    mobile: 'https://robinhood.com/us/en/support/articles/connect-to-dapps/',
    qrCode: 'https://robinhood.com/us/en/support/articles/connect-to-dapps/',
  },
  mobile: {
    getUri: (uri) => uri,
  },
  qrCode: {
    getUri: (uri) => uri,
    instructions: {
      learnMoreUrl: 'https://robinhood.com/us/en/support/articles/connect-to-dapps/',
      steps: [
        {
          title: 'Open Robinhood Wallet',
          description: 'Use Robinhood Wallet on your phone. It natively supports Robinhood Chain.',
          step: 'install',
        },
        {
          title: 'Scan this code',
          description: 'Tap Scan in Robinhood Wallet, then approve the Vince connection.',
          step: 'scan',
        },
        {
          title: 'Confirm',
          description: 'Approve the request so Vince can use this wallet id on Robinhood Chain.',
          step: 'refresh',
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
})
