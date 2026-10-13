// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {TaxHook} from "../src/TaxHook.sol";
import {Launcher} from "../src/Launcher.sol";
import {LaunchMath} from "../src/LaunchMath.sol";
import {ChainAddresses} from "./ChainAddresses.sol";

interface IChainlinkFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

/// @notice Deploys the token (which is also the hook) and launches the pool in ONE transaction.
///
///   DEPLOYER_PRIVATE_KEY   required
///   TREASURY               default: deployer
///   TOKEN_NAME / TOKEN_SYMBOL          default: LatentX / LTX
///   TOTAL_SUPPLY_WHOLE     default: 1_000_000_000
///   START_MARKET_CAP_USD   default: 3000
///   BUY_TAX_BPS / SELL_TAX_BPS         default: 300 / 300 (max 300)
///   DEV_BUY_WEI            default: 0 (ETH the deployer buys inside the launch tx)
///
/// Uniswap and Chainlink addresses are picked by chain id (Robinhood Chain 4663 or Ethereum 1).
///
///   forge script script/Deploy.s.sol --rpc-url robinhood --broadcast
contract Deploy is Script {
    struct Config {
        uint256 pk;
        address deployer;
        address treasury;
        string name;
        string symbol;
        uint256 supplyWhole;
        uint256 startMcUsd;
        uint16 buyBps;
        uint16 sellBps;
        uint256 devBuy;
        uint256 ethUsdE8;
        int24 startTick;
    }

    function run() external {
        ChainAddresses.Book memory book = ChainAddresses.get(block.chainid);
        Config memory c = _config(book);
        IPoolManager manager = IPoolManager(book.poolManager);
        require(address(manager).code.length > 0, "PoolManager missing on this chain");

        address launcherAddr = vm.computeCreateAddress(c.deployer, vm.getNonce(c.deployer));
        bytes memory args = abi.encode(
            manager, c.name, c.symbol, c.supplyWhole * 1e18, c.deployer, c.treasury, c.buyBps, c.sellBps
        );
        (address predicted, bytes32 salt) = HookMiner.find(launcherAddr, _flags(), type(TaxHook).creationCode, args);

        console2.log("chain id       ", block.chainid);
        console2.log("deployer       ", c.deployer);
        console2.log("treasury       ", c.treasury);
        console2.log("ETH/USD        ", c.ethUsdE8 / 1e8);
        console2.log("start tick     ", c.startTick);
        console2.log("dev buy (wei)  ", c.devBuy);

        vm.startBroadcast(c.pk);
        Launcher launcher =
            new Launcher{value: c.devBuy}(salt, abi.encodePacked(type(TaxHook).creationCode, args), c.startTick);
        vm.stopBroadcast();
        require(address(launcher) == launcherAddr, "launcher address mismatch");

        TaxHook token = TaxHook(predicted);
        require(token.launched(), "launch failed");
        uint256 mc = LaunchMath.marketCapUsd(c.supplyWhole, c.ethUsdE8, TickMath.getSqrtPriceAtTick(c.startTick));
        console2.log("TOKEN CA       ", predicted);
        console2.log("dev tokens     ", token.balanceOf(c.deployer) / 1e18);
        console2.log("start mcap USD ", mc);
        _record(c, predicted, mc);
    }

    function _config(ChainAddresses.Book memory book) internal view returns (Config memory c) {
        c.pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
        c.treasury = vm.envOr("TREASURY", c.deployer);
        c.name = vm.envOr("TOKEN_NAME", string("LatentX"));
        c.symbol = vm.envOr("TOKEN_SYMBOL", string("LTX"));
        c.supplyWhole = vm.envOr("TOTAL_SUPPLY_WHOLE", uint256(1_000_000_000));
        c.startMcUsd = vm.envOr("START_MARKET_CAP_USD", uint256(3_000));
        c.buyBps = uint16(vm.envOr("BUY_TAX_BPS", uint256(300)));
        c.sellBps = uint16(vm.envOr("SELL_TAX_BPS", uint256(300)));
        c.devBuy = vm.envOr("DEV_BUY_WEI", uint256(0));

        (, int256 answer,, uint256 updatedAt,) = IChainlinkFeed(book.ethUsdFeed).latestRoundData();
        require(answer > 0 && block.timestamp - updatedAt <= book.maxPriceAge, "stale ETH/USD price");
        c.ethUsdE8 = uint256(answer);
        c.startTick = LaunchMath.startTick(c.supplyWhole, c.ethUsdE8, c.startMcUsd, 200);
    }

    function _flags() internal pure returns (uint160) {
        return uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
                | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
        );
    }

    function _record(Config memory c, address token, uint256 mc) internal {
        string memory json = "deploy";
        vm.serializeAddress(json, "token", token);
        vm.serializeString(json, "name", c.name);
        vm.serializeString(json, "symbol", c.symbol);
        vm.serializeAddress(json, "treasury", c.treasury);
        vm.serializeAddress(json, "owner", c.deployer);
        vm.serializeInt(json, "startTick", c.startTick);
        vm.serializeUint(json, "ethUsdE8", c.ethUsdE8);
        vm.serializeUint(json, "devBuyWei", c.devBuy);
        vm.serializeUint(json, "buyTaxBps", c.buyBps);
        vm.serializeUint(json, "sellTaxBps", c.sellBps);
        string memory out = vm.serializeUint(json, "startMarketCapUsd", mc);
        vm.writeJson(out, string.concat("./deployments/", vm.toString(block.chainid), ".json"));
    }
}
