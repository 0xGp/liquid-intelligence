// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {console2} from "forge-std/Test.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

import {TaxHook} from "../src/TaxHook.sol";
import {Launcher} from "../src/Launcher.sol";
import {LaunchMath} from "../src/LaunchMath.sol";
import {ChainAddresses} from "../script/ChainAddresses.sol";
import {LaunchFixture, RejectsEth} from "./LaunchFixture.sol";

contract TaxHookTest is LaunchFixture {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    // ------------------------------------------------------------------ launch

    function test_launch_startsAtAbout3kMarketCap() public view {
        (uint160 sqrtPrice, int24 tick,,) = manager.getSlot0(key.toId());
        uint256 mc = LaunchMath.marketCapUsd(SUPPLY_WHOLE, ethUsdE8, sqrtPrice);
        console2.log("ETH/USD (Chainlink at fork block):", ethUsdE8 / 1e8);
        console2.log("start tick:", tick);
        console2.log("start market cap USD:", mc);
        assertEq(tick, startTick);
        assertGe(mc, 3_000);
        assertLe(mc, 3_061);
    }

    function test_launch_allTokensLockedAndZeroEth() public view {
        assertEq(token.balanceOf(address(hook)), 0, "hook keeps nothing");
        assertLt(token.balanceOf(dev), 1e9, "dev holds only rounding dust (< 0.000000001 token)");
        uint128 liq = manager.getPositionLiquidity(
            key.toId(), _positionId(address(hook), TickMath.minUsableTick(200), startTick)
        );
        assertEq(liq, hook.lockedLiquidity());
        assertGt(liq, 0);
        assertEq(manager.getLiquidity(key.toId()), 0, "nothing active until first buy");
    }

    function test_launch_onlyOwnerAndOnlyOnce() public {
        TaxHook h2 = _deploy(alice, treasury);
        vm.prank(sniper);
        vm.expectRevert(TaxHook.NotOwner.selector);
        h2.launch(startTick);

        vm.prank(dev);
        vm.expectRevert(TaxHook.AlreadyLaunched.selector);
        hook.launch(startTick);
    }

    function test_token_isTheHook_singleAddress() public view {
        assertEq(Currency.unwrap(key.currency1), address(hook));
        assertEq(address(key.hooks), address(hook));
        assertEq(hook.totalSupply(), SUPPLY);
        assertEq(hook.name(), "LatentX");
        assertEq(hook.symbol(), "LTX");
        assertEq(hook.decimals(), 18);
    }

    /// The real deploy path: one transaction from the deployer creates the token and launches the pool.
    function test_launcher_deploysAndLaunchesInOneTransaction() public {
        address launcherAddr = vm.computeCreateAddress(address(this), vm.getNonce(address(this)));
        bytes memory args = _hookArgs(alice, alice, TAX_BPS, TAX_BPS);
        (address predicted, bytes32 salt) = HookMiner.find(launcherAddr, _flags(), type(TaxHook).creationCode, args);

        Launcher l = new Launcher{value: 0.1 ether}(salt, abi.encodePacked(type(TaxHook).creationCode, args), startTick);
        assertEq(address(l), launcherAddr);

        TaxHook t = TaxHook(predicted);
        assertTrue(t.launched());
        assertEq(t.owner(), alice);
        assertEq(t.launcher(), launcherAddr);
        assertGt(t.balanceOf(alice), 0, "dev buy delivered to the owner");
        assertEq(t.balanceOf(launcherAddr), 0);
        assertEq(launcherAddr.balance, 0);

        vm.prank(launcherAddr);
        vm.expectRevert(TaxHook.AlreadyLaunched.selector);
        t.launch(startTick);
    }

    function test_nobodyElseCanCreateAPoolWithThisHook() public {
        PoolKey memory fake = key;
        fake.tickSpacing = 60;
        vm.prank(sniper);
        vm.expectRevert();
        manager.initialize(fake, TickMath.getSqrtPriceAtTick(0));
    }

    function test_nobodyCanFrontRunPoolCreationBeforeLaunch() public {
        TaxHook h2 = _deploy(alice, treasury);
        PoolKey memory k = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(h2)),
            fee: 0,
            tickSpacing: 200,
            hooks: IHooks(address(h2))
        });
        vm.prank(sniper);
        vm.expectRevert();
        manager.initialize(k, TickMath.getSqrtPriceAtTick(0));

        vm.prank(alice);
        h2.launch(startTick);
        assertTrue(h2.launched());
    }

    // ------------------------------------------------------------------ the four tax routes

    function test_buy_exactEthIn_takes3PercentOfEth() public {
        uint256 ethIn = 1 ether;
        (uint256 spent, uint256 got) = _buyExactIn(alice, ethIn);
        assertEq(spent, ethIn);
        assertEq(hook.pendingTaxes(), ethIn * TAX_BPS / 10_000);
        assertGt(got, 0);
    }

    function testFuzz_buy_exactEthIn(uint256 ethIn) public {
        ethIn = bound(ethIn, 1e9, 50 ether);
        _buyExactIn(alice, ethIn);
        assertEq(hook.pendingTaxes(), ethIn * TAX_BPS / 10_000);
    }

    function test_buy_exactTokensOut_takes3PercentOfTotalPaid() public {
        uint256 tokensWanted = 100_000_000e18;
        uint256 balBefore = 10 ether;
        vm.deal(alice, balBefore);
        vm.prank(alice);
        swapRouter.swap{value: balBefore}(
            key, SwapParams(true, int256(tokensWanted), TickMath.MIN_SQRT_PRICE + 1), settings, ""
        );
        uint256 paid = balBefore - alice.balance;
        assertEq(token.balanceOf(alice), tokensWanted);
        _assertTaxShare(hook.pendingTaxes(), paid);
    }

    function test_sell_exactTokensIn_takes3PercentOfEthOut() public {
        _buyExactIn(alice, 1 ether);
        uint256 taxBefore = hook.pendingTaxes();
        uint256 tokens = token.balanceOf(alice);

        uint256 received = _sellExactIn(alice, tokens);
        uint256 tax = hook.pendingTaxes() - taxBefore;
        _assertTaxShare(tax, received + tax);
        console2.log("bought with 1 ETH, sold everything back, received (wei):", received);
    }

    function test_sell_exactEthOut_takes3PercentOfGross() public {
        _buyExactIn(alice, 1 ether);
        uint256 taxBefore = hook.pendingTaxes();
        uint256 ethWanted = 0.5 ether;
        uint256 ethBefore = alice.balance;

        vm.startPrank(alice);
        token.approve(address(swapRouter), type(uint256).max);
        swapRouter.swap(key, SwapParams(false, int256(ethWanted), TickMath.MAX_SQRT_PRICE - 1), settings, "");
        vm.stopPrank();

        assertEq(alice.balance - ethBefore, ethWanted, "seller gets exactly what they asked for");
        _assertTaxShare(hook.pendingTaxes() - taxBefore, ethWanted + (hook.pendingTaxes() - taxBefore));
    }

    // ------------------------------------------------------------------ treasury + owner powers

    function test_sweep_onlyOwnerOrTreasury_alwaysPaysTreasury() public {
        _buyExactIn(alice, 2 ether);
        uint256 pending = hook.pendingTaxes();

        vm.prank(sniper);
        vm.expectRevert(TaxHook.NotAuthorized.selector);
        hook.sweepTaxes();

        vm.prank(dev);
        hook.sweepTaxes();
        assertEq(treasury.balance, pending, "owner's claim still pays the treasury");
        assertEq(hook.pendingTaxes(), 0);

        _buyExactIn(alice, 1 ether);
        pending = hook.pendingTaxes();
        vm.prank(treasury);
        hook.sweepTaxes();
        assertEq(hook.pendingTaxes(), 0);
        assertGt(treasury.balance, pending);
    }

    function test_brokenTreasury_neverBlocksTrading() public {
        RejectsEth bad = new RejectsEth();
        vm.prank(dev);
        hook.setTreasury(address(bad));

        _buyExactIn(alice, 1 ether);
        uint256 received = _sellExactIn(alice, token.balanceOf(alice));
        assertGt(received, 0, "sell still works");

        vm.prank(dev);
        vm.expectRevert();
        hook.sweepTaxes();
        assertGt(hook.pendingTaxes(), 0, "taxes wait safely until treasury is fixed");
    }

    function test_taxes_canOnlyGoDown() public {
        vm.startPrank(dev);
        vm.expectRevert(TaxHook.TaxCanOnlyGoDown.selector);
        hook.lowerTaxes(301, 300);
        hook.lowerTaxes(100, 0);
        vm.expectRevert(TaxHook.TaxCanOnlyGoDown.selector);
        hook.lowerTaxes(200, 0);
        vm.stopPrank();

        _buyExactIn(alice, 1 ether);
        assertEq(hook.pendingTaxes(), 0.01 ether);
        uint256 before = hook.pendingTaxes();
        _sellExactIn(alice, token.balanceOf(alice));
        assertEq(hook.pendingTaxes(), before, "0% sell tax");
    }

    function test_constructor_rejectsTaxAbove3Percent() public {
        bytes memory args = _hookArgs(dev, treasury, 301, 300);
        (address predicted, bytes32 salt) = HookMiner.find(address(this), _flags(), type(TaxHook).creationCode, args);
        predicted;
        vm.expectRevert(TaxHook.TaxTooHigh.selector);
        new TaxHook{salt: salt}(manager, "LatentX", "LTX", SUPPLY, dev, treasury, 301, 300);
    }

    function test_onlyOwnerControls() public {
        vm.startPrank(sniper);
        vm.expectRevert(TaxHook.NotOwner.selector);
        hook.lowerTaxes(0, 0);
        vm.expectRevert(TaxHook.NotOwner.selector);
        hook.setTreasury(sniper);
        vm.expectRevert(TaxHook.NotOwner.selector);
        hook.transferOwnership(sniper);
        vm.stopPrank();
    }

    function test_liquidityStaysLockedAfterHeavyTrading() public {
        uint128 locked = hook.lockedLiquidity();
        for (uint256 i; i < 5; i++) {
            _buyExactIn(alice, 3 ether);
            _sellExactIn(alice, token.balanceOf(alice) / 2);
        }
        uint128 liq = manager.getPositionLiquidity(
            key.toId(), _positionId(address(hook), TickMath.minUsableTick(200), startTick)
        );
        assertEq(liq, locked);
    }

    // ------------------------------------------------------------------ real router used by wallets / Uniswap UI

    function test_universalRouter_buyAndSell() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        _urSwap(true, 0.5 ether, 0.5 ether);
        uint256 tokens = token.balanceOf(alice);
        assertGt(tokens, 0);
        assertEq(hook.pendingTaxes(), 0.015 ether);

        token.approve(ChainAddresses.PERMIT2, type(uint256).max);
        IAllowanceTransfer(ChainAddresses.PERMIT2).approve(
            address(token), book.universalRouter, type(uint160).max, type(uint48).max
        );
        uint256 ethBefore = alice.balance;
        _urSwap(false, tokens, 0);
        vm.stopPrank();
        assertGt(alice.balance, ethBefore);
        assertGt(hook.pendingTaxes(), 0.015 ether);
    }

    // ------------------------------------------------------------------ scenarios for the write-up

    function test_scenario_devBuyIsAtomicAndBeatsSnipers() public {
        TaxHook h2 = _deploy(alice, treasury);
        vm.deal(alice, 0.2 ether);
        vm.prank(alice);
        h2.launch{value: 0.2 ether}(startTick);
        uint256 devTokens = h2.balanceOf(alice);
        assertGt(devTokens, 0, "dev bought inside the launch tx");
        assertEq(h2.pendingTaxes(), 0, "hook does not tax its own launch buy");

        PoolKey memory k2 = h2.poolKey();
        vm.deal(sniper, 0.2 ether);
        vm.prank(sniper);
        swapRouter.swap{value: 0.2 ether}(k2, SwapParams(true, -0.2 ether, TickMath.MIN_SQRT_PRICE + 1), settings, "");
        uint256 sniperTokens = h2.balanceOf(sniper);

        console2.log("dev  0.2 ETH in launch tx  -> tokens:", devTokens / 1e18);
        console2.log("sniper 0.2 ETH right after -> tokens:", sniperTokens / 1e18);
        assertLt(sniperTokens, devTokens);
    }

    function test_scenario_marketCapCurve() public {
        uint256[6] memory steps = [uint256(0.1 ether), 0.4 ether, 0.5 ether, 1 ether, 3 ether, 5 ether];
        uint256 total;
        for (uint256 i; i < steps.length; i++) {
            _buyExactIn(alice, steps[i]);
            total += steps[i];
            (uint160 p,,,) = manager.getSlot0(key.toId());
            console2.log("cumulative ETH bought (milli-ETH):", total / 1e15);
            console2.log("   market cap USD:", LaunchMath.marketCapUsd(SUPPLY_WHOLE, ethUsdE8, p));
        }
        console2.log("tax collected (milli-ETH):", hook.pendingTaxes() / 1e15);
    }
}
