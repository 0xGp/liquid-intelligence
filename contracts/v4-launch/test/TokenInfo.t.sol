// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

import {TokenInfo, IOwnedToken} from "../src/TokenInfo.sol";
import {LaunchFixture} from "./LaunchFixture.sol";

contract TokenInfoTest is LaunchFixture {
    bytes logo;
    TokenInfo info;

    function setUp() public override {
        super.setUp();
        logo = vm.readFileBinary("assets/lat-logo-128.png");
        vm.prank(dev);
        info = new TokenInfo(IOwnedToken(address(hook)), logo, "AI marketplace token", "", "https://x.com/lintelligencerh", "");
    }

    function test_onlyTokenOwnerCanCreate() public {
        vm.prank(sniper);
        vm.expectRevert(TokenInfo.NotTokenOwner.selector);
        new TokenInfo(IOwnedToken(address(hook)), logo, "fake", "", "", "");
    }

    function test_logoIsStoredOnChain() public view {
        assertEq(keccak256(info.logoPng()), keccak256(logo));
        assertEq(info.image(), string.concat("data:image/png;base64,", Base64.encode(logo)));
    }

    function test_contractURIIsValidJson() public view {
        string memory uri = info.contractURI();
        string memory prefix = "data:application/json;base64,";
        bytes memory u = bytes(uri);
        bytes memory b64 = new bytes(u.length - bytes(prefix).length);
        for (uint256 i; i < b64.length; i++) b64[i] = u[i + bytes(prefix).length];
        string memory json = string(_decode(string(b64)));

        assertEq(vm.parseJsonString(json, ".name"), "LatentX");
        assertEq(vm.parseJsonString(json, ".symbol"), "LTX");
        assertEq(vm.parseJsonString(json, ".twitter"), "https://x.com/lintelligencerh");
        assertEq(vm.parseJsonAddress(json, ".token"), address(hook));
        assertEq(vm.parseJsonString(json, ".image"), info.image());
    }

    function test_onlyOwnerEdits_andControlFollowsOwnership() public {
        vm.prank(sniper);
        vm.expectRevert(TokenInfo.NotTokenOwner.selector);
        info.setText("x", "", "", "");

        vm.prank(dev);
        info.setText("new", "https://latentx.example", "https://x.com/lintelligencerh", "https://t.me/latentx");
        assertEq(info.website(), "https://latentx.example");

        vm.prank(dev);
        hook.transferOwnership(alice);
        vm.prank(alice);
        hook.acceptOwnership();

        vm.prank(dev);
        vm.expectRevert(TokenInfo.NotTokenOwner.selector);
        info.setImageURI("ipfs://logo");
        vm.prank(alice);
        info.setImageURI("ipfs://logo");
        assertEq(info.image(), "ipfs://logo");
    }

    function test_rejectsJsonBreakingCharacters() public {
        vm.startPrank(dev);
        vm.expectRevert(TokenInfo.UnsafeCharacter.selector);
        info.setText('evil","image":"x', "", "", "");
        vm.expectRevert(TokenInfo.UnsafeCharacter.selector);
        info.setImageURI("a\\b");
        vm.stopPrank();
    }

    function _decode(string memory b64) internal pure returns (bytes memory out) {
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        bytes memory s = bytes(b64);
        uint256[128] memory rev;
        for (uint256 i; i < 64; i++) rev[uint8(table[i])] = i;
        uint256 pad = s.length > 0 && s[s.length - 1] == "=" ? (s[s.length - 2] == "=" ? 2 : 1) : 0;
        out = new bytes((s.length / 4) * 3 - pad);
        uint256 o;
        for (uint256 i; i < s.length; i += 4) {
            uint256 n = (rev[uint8(s[i])] << 18) | (rev[uint8(s[i + 1])] << 12)
                | (s[i + 2] == "=" ? 0 : rev[uint8(s[i + 2])] << 6) | (s[i + 3] == "=" ? 0 : rev[uint8(s[i + 3])]);
            if (o < out.length) out[o++] = bytes1(uint8(n >> 16));
            if (o < out.length) out[o++] = bytes1(uint8(n >> 8));
            if (o < out.length) out[o++] = bytes1(uint8(n));
        }
    }
}
