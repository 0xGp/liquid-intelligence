// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {TaxHook} from "../src/TaxHook.sol";
import {LaunchMath} from "../src/LaunchMath.sol";
import {ChainAddresses} from "../script/ChainAddresses.sol";

interface IChainlinkFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

contract RejectsEth {
    receive() external payable {
        revert("no ETH");
    }
}

abstract contract LaunchFixture is Test {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    uint256 constant SUPPLY_WHOLE = 1_000_000_000;
    uint256 constant SUPPLY = SUPPLY_WHOLE * 1e18;
    uint256 constant START_MC_USD = 3_000;
    uint16 constant TAX_BPS = 300;
    uint8 constant V4_SWAP = 0x10;

    ChainAddresses.Book book;
    IPoolManager manager;
    PoolSwapTest swapRouter;
    TaxHook hook;
    IERC20 token;
    PoolKey key;
    uint256 ethUsdE8;
    int24 startTick;

    address dev = _actor("dev");
    address treasury = _actor("treasury");
    address alice = _actor("alice");
    address sniper = _actor("sniper");

    PoolSwapTest.TestSettings settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

    function setUp() public virtual {
        string memory rpc = vm.envOr("FORK_RPC_URL", string("https://rpc.mainnet.chain.robinhood.com"));
        uint256 forkBlock = vm.envOr("FORK_BLOCK", uint256(0));
        if (forkBlock == 0) vm.createSelectFork(rpc);
        else vm.createSelectFork(rpc, forkBlock);
        book = ChainAddresses.get(block.chainid);
        manager = IPoolManager(book.poolManager);
        // Addresses derived from public test keys can be EIP-7702-delegated to sweeper bots.
        vm.etch(dev, "");
        vm.etch(treasury, "");
        vm.etch(alice, "");
        vm.etch(sniper, "");
        (, int256 answer,,,) = IChainlinkFeed(book.ethUsdFeed).latestRoundData();
        ethUsdE8 = uint256(answer);
        startTick = LaunchMath.startTick(SUPPLY_WHOLE, ethUsdE8, START_MC_USD, 200);
        swapRouter = new PoolSwapTest(manager);
        // Its address can already hold stray ETH, which it would refund to the first trader.
        vm.deal(address(swapRouter), 0);

        hook = _deploy(dev, treasury);
        token = IERC20(address(hook));
        vm.prank(dev);
        hook.launch(startTick);
        key = hook.poolKey();
    }

    // ------------------------------------------------------------------ helpers

    function _hookArgs(address owner_, address treasury_, uint16 buyBps, uint16 sellBps)
        internal
        view
        returns (bytes memory)
    {
        return abi.encode(manager, "LatentX", "LTX", SUPPLY, owner_, treasury_, buyBps, sellBps);
    }

    function _deploy(address owner_, address treasury_) internal returns (TaxHook h) {
        bytes memory args = _hookArgs(owner_, treasury_, TAX_BPS, TAX_BPS);
        (address predicted, bytes32 salt) = HookMiner.find(address(this), _flags(), type(TaxHook).creationCode, args);
        h = new TaxHook{salt: salt}(manager, "LatentX", "LTX", SUPPLY, owner_, treasury_, TAX_BPS, TAX_BPS);
        assertEq(address(h), predicted);
    }

    function _actor(string memory label) internal returns (address) {
        return makeAddr(string.concat("latentx.", label));
    }

    function _flags() internal pure returns (uint160) {
        return uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
                | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
        );
    }

    function _buyExactIn(address who, uint256 ethIn) internal returns (uint256 spent, uint256 got) {
        vm.deal(who, who.balance + ethIn);
        uint256 ethBefore = who.balance;
        uint256 tokBefore = token.balanceOf(who);
        vm.prank(who);
        swapRouter.swap{value: ethIn}(key, SwapParams(true, -int256(ethIn), TickMath.MIN_SQRT_PRICE + 1), settings, "");
        spent = ethBefore - who.balance;
        got = token.balanceOf(who) - tokBefore;
    }

    function _sellExactIn(address who, uint256 tokens) internal returns (uint256 received) {
        uint256 before = who.balance;
        vm.startPrank(who);
        token.approve(address(swapRouter), tokens);
        swapRouter.swap(key, SwapParams(false, -int256(tokens), TickMath.MAX_SQRT_PRICE - 1), settings, "");
        vm.stopPrank();
        received = who.balance - before;
    }

    function _urSwap(bool buy, uint256 amountIn, uint256 value) internal {
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE), uint8(Actions.SETTLE_ALL), uint8(Actions.TAKE_ALL)
        );
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: buy,
                amountIn: uint128(amountIn),
                amountOutMinimum: 0,
                hookData: ""
            })
        );
        (Currency inC, Currency outC) = buy ? (key.currency0, key.currency1) : (key.currency1, key.currency0);
        params[1] = abi.encode(inC, amountIn);
        params[2] = abi.encode(outC, uint256(0));
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(actions, params);
        IUniversalRouter(book.universalRouter).execute{value: value}(
            abi.encodePacked(V4_SWAP), inputs, block.timestamp + 60
        );
    }

    /// @dev Tax must be 3% of the gross ETH amount, allowing 1 wei of rounding.
    function _assertTaxShare(uint256 tax, uint256 gross) internal pure {
        assertApproxEqAbs(tax, gross * TAX_BPS / 10_000, 1);
    }

    function _positionId(address owner_, int24 lower, int24 upper) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_, lower, upper, bytes32(0)));
    }

    receive() external payable {}
}
