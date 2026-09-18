import React from 'react'
import MarketplaceGrid from './MarketplaceGrid'
import ConfigPanel from './ConfigPanel'
import MarketplaceFooter from './MarketplaceFooter'

export default function MarketplaceView() {
  return (
    <div className="marketplace-view-container" id="marketplace">
      <MarketplaceGrid />
      <ConfigPanel />
      <MarketplaceFooter />
    </div>
  )
}
