// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

import {TaxHook} from "../src/TaxHook.sol";
import {ChainAddresses} from "../script/ChainAddresses.sol";

interface IUniversalRouterLive {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @notice Honeypot check against the deployed LAT token on Robinhood Chain:
/// a fresh wallet buys and then sells through Uniswap's Universal Router.
/// Run: LIVE_TOKEN=0x9dB8D224539d4fF0c7051346228bdd12b604E8Cc forge test --match-contract LiveTest -vv
contract LiveTest is Test {
    TaxHook token;
    ChainAddresses.Book book;
    PoolKey key;
    address trader = makeAddr("latentx.live-trader");

    function setUp() public {
        address live = vm.envOr("LIVE_TOKEN", address(0));
        if (live == address(0)) return;
        vm.createSelectFork(vm.envOr("FORK_RPC_URL", string("https://rpc.mainnet.chain.robinhood.com")));
        book = ChainAddresses.get(block.chainid);
        token = TaxHook(live);
        key = token.poolKey();
        vm.etch(trader, "");
    }

    function test_live_buyThenSellAll() public {
        if (address(token) == address(0)) return;
        vm.deal(trader, 0.01 ether);
        uint256 taxBefore = token.pendingTaxes();

        vm.startPrank(trader);
        _swap(true, 0.005 ether, 0.005 ether);
        uint256 bought = token.balanceOf(trader);
        uint256 ethAfterBuy = trader.balance;

        token.approve(ChainAddresses.PERMIT2, type(uint256).max);
        IAllowanceTransfer(ChainAddresses.PERMIT2).approve(
            address(token), book.universalRouter, type(uint160).max, type(uint48).max
        );
        _swap(false, bought, 0);
        vm.stopPrank();

        uint256 ethBack = trader.balance - ethAfterBuy;
        console2.log("bought LAT (whole):", bought / 1e18);
        console2.log("sold all, ETH back (wei):", ethBack);
        console2.log("tax collected (wei):", token.pendingTaxes() - taxBefore);
        assertGt(bought, 0);
        assertEq(token.balanceOf(trader), 0);
        assertGt(ethBack, 0.0045 ether, "round trip loses only ~6% tax");
    }

    function _swap(bool buy, uint256 amountIn, uint256 value) internal {
        bytes memory actions =
            abi.encodePacked(uint8(Actions.SWAP_EXACT_IN_SINGLE), uint8(Actions.SETTLE_ALL), uint8(Actions.TAKE_ALL));
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key, zeroForOne: buy, amountIn: uint128(amountIn), amountOutMinimum: 0, hookData: ""
            })
        );
        (Currency inC, Currency outC) = buy ? (key.currency0, key.currency1) : (key.currency1, key.currency0);
        params[1] = abi.encode(inC, amountIn);
        params[2] = abi.encode(outC, uint256(0));
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(actions, params);
        IUniversalRouterLive(book.universalRouter).execute{value: value}(
            abi.encodePacked(uint8(0x10)), inputs, block.timestamp + 60
        );
    }
}
