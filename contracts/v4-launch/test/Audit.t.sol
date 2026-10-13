// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {CustomRevert} from "@uniswap/v4-core/src/libraries/CustomRevert.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolIdLibrary, PoolKey} from "@uniswap/v4-core/src/types/PoolId.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";

import {TaxHook} from "../src/TaxHook.sol";
import {LaunchFixture} from "./LaunchFixture.sol";

/// @notice Regression tests for the audit findings.
contract AuditTest is LaunchFixture {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    PoolModifyLiquidityTest lpRouter;

    function setUp() public override {
        super.setUp();
        lpRouter = new PoolModifyLiquidityTest(manager);
        vm.deal(address(lpRouter), 0);
    }

    // ------------------------------------------------------------------ M-01: taxless range orders

    /// Range-order sell: park tokens as liquidity just below the price and let buyers turn them into ETH.
    function test_M01_tokenOnlyRangeOrderBelowPriceIsBlocked() public {
        _buyExactIn(alice, 0.5 ether);
        uint256 tokens = token.balanceOf(alice);

        (, int24 tick,,) = manager.getSlot0(key.toId());
        int24 upper = tick - (tick % TICK_SPACING_);
        int24 lower = upper - 2_000;
        uint128 liq = LiquidityAmounts.getLiquidityForAmount1(
            TickMath.getSqrtPriceAtTick(lower), TickMath.getSqrtPriceAtTick(upper), tokens
        );

        vm.startPrank(alice);
        token.approve(address(lpRouter), type(uint256).max);
        _expectLiquidityLocked();
        lpRouter.modifyLiquidity(key, ModifyLiquidityParams(lower, upper, int256(uint256(liq)), 0), "");
        vm.stopPrank();
    }

    /// Range-order buy: park ETH as liquidity just above the price and let sellers turn it into tokens.
    function test_M01_ethOnlyRangeOrderAbovePriceIsBlocked() public {
        (, int24 tick,,) = manager.getSlot0(key.toId());
        int24 lower = tick - (tick % TICK_SPACING_) + TICK_SPACING_;
        int24 upper = lower + 2_000;
        uint128 liq = LiquidityAmounts.getLiquidityForAmount0(
            TickMath.getSqrtPriceAtTick(lower), TickMath.getSqrtPriceAtTick(upper), 1 ether
        );

        vm.deal(alice, 2 ether);
        vm.prank(alice);
        _expectLiquidityLocked();
        lpRouter.modifyLiquidity{value: 2 ether}(
            key, ModifyLiquidityParams(lower, upper, int256(uint256(liq)), 0), ""
        );
    }

    function test_M01_launchLiquidityStillInPlace() public view {
        uint128 liq = manager.getPositionLiquidity(
            key.toId(), _positionId(address(hook), TickMath.minUsableTick(TICK_SPACING_), startTick)
        );
        assertEq(liq, hook.lockedLiquidity());
        assertGt(liq, 0);
    }

    // ------------------------------------------------------------------ L-01: two-step ownership

    function test_L01_ownershipNeedsAcceptance() public {
        address next = _actor("next-owner");

        vm.prank(dev);
        hook.transferOwnership(next);
        assertEq(hook.owner(), dev, "owner unchanged until accepted");
        assertEq(hook.pendingOwner(), next);

        vm.prank(sniper);
        vm.expectRevert(TaxHook.NotPendingOwner.selector);
        hook.acceptOwnership();

        vm.prank(next);
        hook.acceptOwnership();
        assertEq(hook.owner(), next);
        assertEq(hook.pendingOwner(), address(0));

        vm.prank(dev);
        vm.expectRevert(TaxHook.NotOwner.selector);
        hook.lowerTaxes(0, 0);
    }

    function test_L01_typoedTransferCanBeOverwritten() public {
        vm.startPrank(dev);
        hook.transferOwnership(address(0xdead));
        hook.transferOwnership(address(0));
        vm.stopPrank();
        assertEq(hook.owner(), dev);
        assertEq(hook.pendingOwner(), address(0));
    }

    function test_L01_renounceIsExplicitAndFinal() public {
        vm.prank(sniper);
        vm.expectRevert(TaxHook.NotOwner.selector);
        hook.renounceOwnership();

        vm.startPrank(dev);
        hook.transferOwnership(alice);
        hook.renounceOwnership();
        vm.stopPrank();
        assertEq(hook.owner(), address(0));

        vm.prank(alice);
        vm.expectRevert(TaxHook.NotPendingOwner.selector);
        hook.acceptOwnership();

        _buyExactIn(bob(), 0.1 ether);
        assertGt(hook.pendingTaxes(), 0, "trading and taxes keep working without an owner");
        vm.prank(treasury);
        hook.sweepTaxes();
        assertEq(hook.pendingTaxes(), 0);
    }

    // ------------------------------------------------------------------ helpers

    int24 constant TICK_SPACING_ = 200;

    function bob() internal returns (address b) {
        b = _actor("bob");
        vm.etch(b, "");
    }

    function _expectLiquidityLocked() internal {
        vm.expectRevert(
            abi.encodeWithSelector(
                CustomRevert.WrappedError.selector,
                address(hook),
                IHooks.beforeAddLiquidity.selector,
                abi.encodeWithSelector(TaxHook.LiquidityLocked.selector),
                abi.encodeWithSelector(Hooks.HookCallFailed.selector)
            )
        );
    }
}
