// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @notice Converts a USD market cap target into a pool tick for an ETH (currency0) / token (currency1) pool.
/// Both assets use 18 decimals, so the pool price is simply "tokens per 1 ETH".
library LaunchMath {
    uint256 internal constant Q192 = 1 << 192;

    /// @param supplyWhole Total token supply in whole tokens (1e9 for one billion).
    /// @param ethUsdE8 ETH price in USD with 8 decimals (Chainlink format).
    /// @param targetMarketCapUsd Target fully diluted market cap in whole USD.
    /// @return tick Start tick, rounded down onto the spacing grid (market cap lands at or just above target).
    function startTick(uint256 supplyWhole, uint256 ethUsdE8, uint256 targetMarketCapUsd, int24 tickSpacing)
        internal
        pure
        returns (int24 tick)
    {
        uint256 priceX192 = Math.mulDiv(supplyWhole * ethUsdE8, Q192, targetMarketCapUsd * 1e8);
        tick = TickMath.getTickAtSqrtPrice(uint160(Math.sqrt(priceX192)));
        int24 rem = tick % tickSpacing;
        tick -= rem;
        if (rem < 0) tick -= tickSpacing;
    }

    /// @return Fully diluted market cap in whole USD at `sqrtPriceX96`.
    function marketCapUsd(uint256 supplyWhole, uint256 ethUsdE8, uint160 sqrtPriceX96)
        internal
        pure
        returns (uint256)
    {
        uint256 priceX192 = uint256(sqrtPriceX96) * sqrtPriceX96;
        return Math.mulDiv(supplyWhole * ethUsdE8, Q192, priceX192) / 1e8;
    }
}
