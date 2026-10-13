// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Uniswap v4 and Chainlink contracts used by the launch, per chain.
/// Sources: developers.uniswap.org/docs/protocols/v4/deployments and Chainlink's feed directory.
library ChainAddresses {
    uint256 internal constant ETHEREUM = 1;
    uint256 internal constant ROBINHOOD = 4663;

    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    struct Book {
        address poolManager;
        address universalRouter;
        address ethUsdFeed;
        /// Feed heartbeat plus an hour; older prices are rejected.
        uint256 maxPriceAge;
    }

    function get(uint256 chainId) internal pure returns (Book memory) {
        if (chainId == ROBINHOOD) {
            return Book({
                poolManager: 0x8366a39CC670B4001A1121B8F6A443A643e40951,
                universalRouter: 0x8876789976dEcBfCbBbe364623C63652db8C0904,
                ethUsdFeed: 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9,
                maxPriceAge: 25 hours
            });
        }
        if (chainId == ETHEREUM) {
            return Book({
                poolManager: 0x000000000004444c5dc75cB358380D2e3dE08A90,
                universalRouter: 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af,
                ethUsdFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419,
                maxPriceAge: 2 hours
            });
        }
        revert("unsupported chain");
    }
}
