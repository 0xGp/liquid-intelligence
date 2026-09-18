// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Vince platform credit ledger — Robinhood Testnet / Mainnet
 *
 * Users deposit native ETH → micro-credits minted to their address.
 * Before using marketplace models they call spend() to burn credits.
 * Escrowed ETH can be withdrawn by owner to the treasury.
 */
contract CreditLedger {
    uint256 public constant CREDITS_PER_ETH = 5_000;
    /// 1 credit = 1e6 micro-credits (supports fractional prices).
    uint256 public constant MICRO = 1e6;
    uint256 public constant MIN_DEPOSIT_WEI = 0.001 ether;

    address public owner;
    address public treasury;

    mapping(address => uint256) public microCredits;

    event Deposited(address indexed payer, uint256 ethIn, uint256 microCreditsAdded);
    event Spent(address indexed payer, uint256 microCreditsBurned);
    event Withdrawn(address indexed to, uint256 amount);
    event TreasuryUpdated(address indexed treasury);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address treasury_) {
        require(treasury_ != address(0), "treasury");
        owner = msg.sender;
        treasury = treasury_;
    }

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "treasury");
        treasury = t;
        emit TreasuryUpdated(t);
    }

    /// Deposit native ETH → mint micro-credits to msg.sender.
    function deposit() external payable {
        require(msg.value >= MIN_DEPOSIT_WEI, "min deposit");
        uint256 microAdded = (msg.value * CREDITS_PER_ETH * MICRO) / 1 ether;
        require(microAdded > 0, "dust");
        microCredits[msg.sender] += microAdded;
        emit Deposited(msg.sender, msg.value, microAdded);
    }

    /// Burn micro-credits from msg.sender (call before / as payment for model use).
    function spend(uint256 microCost) external {
        require(microCost > 0, "cost");
        require(microCredits[msg.sender] >= microCost, "insufficient credits");
        microCredits[msg.sender] -= microCost;
        emit Spent(msg.sender, microCost);
    }

    function balanceOf(address account) external view returns (uint256) {
        return microCredits[account];
    }

    /// Pull escrowed ETH to treasury (amount=0 → full balance).
    function withdraw(address to, uint256 amount) external onlyOwner {
        address dest = to == address(0) ? treasury : to;
        uint256 amt = amount == 0 ? address(this).balance : amount;
        require(amt > 0, "zero");
        require(address(this).balance >= amt, "balance");
        (bool ok, ) = dest.call{value: amt}("");
        require(ok, "transfer");
        emit Withdrawn(dest, amt);
    }
}
