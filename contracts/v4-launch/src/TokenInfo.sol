// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SSTORE2} from "solmate/src/utils/SSTORE2.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

interface IOwnedToken {
    function owner() external view returns (address);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

/// @title TokenInfo
/// @notice On-chain profile for a token whose own contract cannot be changed: logo, description and
/// social links, served as ERC-7572 `contractURI()` JSON. The logo PNG lives on-chain (SSTORE2), so the
/// profile never depends on a website staying online. Only the token's current owner can create or edit
/// it, so control follows the token's ownership.
contract TokenInfo {
    IOwnedToken public immutable token;

    address public logoPointer;
    /// @notice Optional hosted image (https:// or ipfs://); when set it is served instead of the on-chain PNG.
    string public imageURI;
    string public description;
    string public website;
    string public twitter;
    string public telegram;

    event ContractURIUpdated();

    error NotTokenOwner();
    error UnsafeCharacter();

    modifier onlyTokenOwner() {
        if (msg.sender != token.owner()) revert NotTokenOwner();
        _;
    }

    constructor(
        IOwnedToken token_,
        bytes memory logo,
        string memory description_,
        string memory website_,
        string memory twitter_,
        string memory telegram_
    ) {
        token = token_;
        if (msg.sender != token_.owner()) revert NotTokenOwner();
        if (logo.length > 0) logoPointer = SSTORE2.write(logo);
        _setText(description_, website_, twitter_, telegram_);
    }

    // ------------------------------------------------------------------ views

    /// @notice ERC-7572 contract-level metadata, as a base64 JSON data URI.
    function contractURI() external view returns (string memory) {
        string memory json = string.concat(
            '{"name":"',
            token.name(),
            '","symbol":"',
            token.symbol(),
            '","description":"',
            description,
            '","image":"',
            image(),
            '","external_link":"',
            website,
            '","twitter":"',
            twitter,
            '","telegram":"',
            telegram,
            '","token":"',
            _toHex(address(token)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @notice Logo as a URI: the hosted `imageURI` if set, otherwise the on-chain PNG as a data URI.
    function image() public view returns (string memory) {
        if (bytes(imageURI).length > 0) return imageURI;
        if (logoPointer == address(0)) return "";
        return string.concat("data:image/png;base64,", Base64.encode(SSTORE2.read(logoPointer)));
    }

    function logoPng() external view returns (bytes memory) {
        return logoPointer == address(0) ? bytes("") : SSTORE2.read(logoPointer);
    }

    // ------------------------------------------------------------------ owner edits

    function setText(
        string calldata description_,
        string calldata website_,
        string calldata twitter_,
        string calldata telegram_
    ) external onlyTokenOwner {
        _setText(description_, website_, twitter_, telegram_);
        emit ContractURIUpdated();
    }

    function setLogo(bytes calldata logoPng_) external onlyTokenOwner {
        logoPointer = logoPng_.length > 0 ? SSTORE2.write(logoPng_) : address(0);
        emit ContractURIUpdated();
    }

    function setImageURI(string calldata imageURI_) external onlyTokenOwner {
        _requireJsonSafe(imageURI_);
        imageURI = imageURI_;
        emit ContractURIUpdated();
    }

    // ------------------------------------------------------------------ internals

    function _setText(string memory d, string memory w, string memory x, string memory t) internal {
        _requireJsonSafe(d);
        _requireJsonSafe(w);
        _requireJsonSafe(x);
        _requireJsonSafe(t);
        description = d;
        website = w;
        twitter = x;
        telegram = t;
    }

    /// @dev Values are embedded in JSON without escaping, so quotes, backslashes and control characters
    /// are rejected rather than allowed to break or inject fields.
    function _requireJsonSafe(string memory s) internal pure {
        bytes memory b = bytes(s);
        for (uint256 i; i < b.length; i++) {
            if (b[i] == '"' || b[i] == "\\" || uint8(b[i]) < 0x20) revert UnsafeCharacter();
        }
    }

    function _toHex(address a) internal pure returns (string memory) {
        bytes memory digits = "0123456789abcdef";
        bytes memory out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        uint160 v = uint160(a);
        for (uint256 i = 41; i > 1; i--) {
            out[i] = digits[v & 0xf];
            v >>= 4;
        }
        return string(out);
    }
}
