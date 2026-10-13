// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {TokenInfo, IOwnedToken} from "../src/TokenInfo.sol";

/// @notice Publishes the on-chain profile (logo, description, links) for an already-launched token.
/// Must be sent from the token's owner.
///
///   DEPLOYER_PRIVATE_KEY   required (the token owner)
///   TOKEN                  default: the token in deployments/<chainid>.json
///   TOKEN_LOGO             default: assets/lat-logo-128.png
///   TOKEN_DESCRIPTION / TOKEN_WEBSITE / TOKEN_TWITTER / TOKEN_TELEGRAM
///
///   forge script script/DeployTokenInfo.s.sol --rpc-url robinhood --broadcast
contract DeployTokenInfo is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory record = string.concat("./deployments/", vm.toString(block.chainid), ".json");
        address token = vm.envOr("TOKEN", vm.parseJsonAddress(vm.readFile(record), ".token"));
        bytes memory logo = vm.readFileBinary(vm.envOr("TOKEN_LOGO", string("assets/lat-logo-128.png")));
        string memory description = vm.envOr(
            "TOKEN_DESCRIPTION",
            string(
                "LatentX Intelligence - AI infrastructure marketplace on Robinhood Chain. Generate AI video and text, rent API access, pay on-chain. 3% buy / 3% sell tax, liquidity locked forever."
            )
        );
        string memory website = vm.envOr("TOKEN_WEBSITE", string(""));
        string memory twitter = vm.envOr("TOKEN_TWITTER", string("https://x.com/lintelligencerh"));
        string memory telegram = vm.envOr("TOKEN_TELEGRAM", string(""));

        require(IOwnedToken(token).owner() == vm.addr(pk), "sender is not the token owner");
        console2.log("token          ", token);
        console2.log("logo bytes     ", logo.length);

        vm.startBroadcast(pk);
        TokenInfo info = new TokenInfo(IOwnedToken(token), logo, description, website, twitter, telegram);
        vm.stopBroadcast();

        console2.log("TOKEN INFO     ", address(info));
        console2.log("logo pointer   ", info.logoPointer());
        vm.writeJson(vm.toString(address(info)), record, ".tokenInfo");
    }
}
