// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {TaxHook} from "./TaxHook.sol";

/// @notice One-shot deployer: its constructor deploys the token/hook with CREATE2 and launches the
/// pool, so the whole launch is a single transaction. It keeps no funds and has no functions.
contract Launcher {
    error DeployFailed();

    /// @param salt CREATE2 salt mined so the deployed address carries the hook permission bits.
    /// @param initCode `TaxHook` creation code with its constructor arguments appended.
    constructor(bytes32 salt, bytes memory initCode, int24 startTick) payable {
        address hook;
        assembly ("memory-safe") {
            hook := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }
        if (hook == address(0)) revert DeployFailed();
        TaxHook(hook).launch{value: msg.value}(startTick);
    }
}
