// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Vince API Key Marketplace — Robinhood Chain / Testnet
 *
 * Stores sealed API-key ciphertext on-chain (public bytes, useless without vault private key).
 * ETH deposits mint credits. Usage is metered by the Vince operator after decrypt-and-call.
 * Lister claimable balance accrues net of platform fee.
 *
 * NEVER store plaintext API keys in this contract.
 */
contract ApiKeyMarketplace {
    uint16 public constant BPS = 10_000;
    /// Credits minted per 1 ETH (matches frontend CREDITS_PER_ETH).
    uint256 public constant CREDITS_PER_ETH = 5_000;
    /// Micro-credits: 1 credit = 1e6 (supports 0.000001 credit prices).
    uint256 public constant MICRO = 1e6;

    address public owner;
    address public operator;
    address public treasury;
    uint16 public platformFeeBps; // e.g. 1000 = 10%

    uint256 public nextListingId = 1;

    struct Listing {
        address lister;
        string provider;
        string kind;
        string title;
        string description;
        uint256 priceMicroCredits; // price per call in micro-credits
        bytes ciphertext; // sealed key blob (versioned)
        bytes32 ciphertextHash;
        bool active;
        uint256 totalCalls;
        uint256 totalMicroBilled;
    }

    mapping(uint256 => Listing) public listings;
    /// listingId => renter => remaining micro-credits
    mapping(uint256 => mapping(address => uint256)) public microCredits;
    /// listingId => ETH owed to lister (claimable)
    mapping(uint256 => uint256) public claimableWei;
    /// accumulated platform fees
    uint256 public platformFeesWei;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed lister,
        string provider,
        string kind,
        uint256 priceMicroCredits,
        bytes32 ciphertextHash
    );
    event ListingStatus(uint256 indexed listingId, bool active);
    event Deposited(
        uint256 indexed listingId,
        address indexed renter,
        uint256 ethIn,
        uint256 microCreditsAdded
    );
    event UsageMetered(
        uint256 indexed listingId,
        address indexed renter,
        uint256 microCreditsBurned,
        uint256 listerWei,
        uint256 platformWei
    );
    event Claimed(uint256 indexed listingId, address indexed lister, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "not operator");
        _;
    }

    constructor(address treasury_, address operator_, uint16 platformFeeBps_) {
        require(treasury_ != address(0), "treasury");
        require(platformFeeBps_ <= BPS, "fee");
        owner = msg.sender;
        treasury = treasury_;
        operator = operator_ == address(0) ? msg.sender : operator_;
        platformFeeBps = platformFeeBps_;
    }

    function setOperator(address op) external onlyOwner {
        require(op != address(0), "op");
        operator = op;
    }

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "treasury");
        treasury = t;
    }

    function setPlatformFeeBps(uint16 bps) external onlyOwner {
        require(bps <= BPS, "fee");
        platformFeeBps = bps;
    }

    /**
     * @param ciphertext Sealed blob from the client (encrypt-to-vault-pubkey).
     *        Anyone can read it on-chain; only Vince vault private key can decrypt.
     */
    function createListing(
        string calldata provider,
        string calldata kind,
        string calldata title,
        string calldata description,
        uint256 priceMicroCredits,
        bytes calldata ciphertext
    ) external returns (uint256 listingId) {
        require(priceMicroCredits > 0, "price");
        require(ciphertext.length >= 32, "ciphertext");
        require(bytes(title).length > 0, "title");

        listingId = nextListingId++;
        bytes32 hash = keccak256(ciphertext);

        listings[listingId] = Listing({
            lister: msg.sender,
            provider: provider,
            kind: kind,
            title: title,
            description: description,
            priceMicroCredits: priceMicroCredits,
            ciphertext: ciphertext,
            ciphertextHash: hash,
            active: true,
            totalCalls: 0,
            totalMicroBilled: 0
        });

        emit ListingCreated(listingId, msg.sender, provider, kind, priceMicroCredits, hash);
    }

    function setListingActive(uint256 listingId, bool active) external {
        Listing storage L = listings[listingId];
        require(L.lister == msg.sender || msg.sender == owner, "auth");
        require(L.lister != address(0), "missing");
        L.active = active;
        emit ListingStatus(listingId, active);
    }

    /// Deposit native ETH → micro-credits for this listing.
    function deposit(uint256 listingId) external payable {
        Listing storage L = listings[listingId];
        require(L.active, "inactive");
        require(L.lister != address(0), "missing");
        require(msg.value > 0, "value");

        uint256 microAdded = (msg.value * CREDITS_PER_ETH * MICRO) / 1 ether;
        require(microAdded > 0, "dust");

        microCredits[listingId][msg.sender] += microAdded;

        // Hold ETH in this contract for later claim split
        emit Deposited(listingId, msg.sender, msg.value, microAdded);
    }

    /**
     * Called by Vince operator AFTER decrypting ciphertext and successfully
     * invoking the upstream provider on behalf of the renter.
     */
    function meterUsage(
        uint256 listingId,
        address renter,
        uint256 microCost
    ) external onlyOperator {
        Listing storage L = listings[listingId];
        require(L.active, "inactive");
        require(microCost > 0, "cost");
        require(microCredits[listingId][renter] >= microCost, "credits");

        microCredits[listingId][renter] -= microCost;
        L.totalCalls += 1;
        L.totalMicroBilled += microCost;

        // Convert burned micro-credits back to wei: micro / (CREDITS_PER_ETH * MICRO) * 1 ether
        uint256 weiBurned = (microCost * 1 ether) / (CREDITS_PER_ETH * MICRO);
        require(weiBurned > 0, "wei dust");
        require(address(this).balance >= weiBurned, "escrow");

        uint256 platformWei = (weiBurned * platformFeeBps) / BPS;
        uint256 listerWei = weiBurned - platformWei;

        platformFeesWei += platformWei;
        claimableWei[listingId] += listerWei;

        emit UsageMetered(listingId, renter, microCost, listerWei, platformWei);
    }

    function claim(uint256 listingId) external {
        Listing storage L = listings[listingId];
        require(L.lister == msg.sender, "not lister");
        uint256 amount = claimableWei[listingId];
        require(amount > 0, "zero");
        claimableWei[listingId] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer");
        emit Claimed(listingId, msg.sender, amount);
    }

    function withdrawPlatformFees(address to) external onlyOwner {
        uint256 amount = platformFeesWei;
        require(amount > 0, "zero");
        platformFeesWei = 0;
        address dest = to == address(0) ? treasury : to;
        (bool ok, ) = dest.call{value: amount}("");
        require(ok, "transfer");
        emit PlatformFeesWithdrawn(dest, amount);
    }

    function getCiphertext(uint256 listingId) external view returns (bytes memory) {
        return listings[listingId].ciphertext;
    }

    function getListing(uint256 listingId)
        external
        view
        returns (
            address lister,
            string memory provider,
            string memory kind,
            string memory title,
            string memory description,
            uint256 priceMicroCredits,
            bytes32 ciphertextHash,
            bool active,
            uint256 totalCalls,
            uint256 totalMicroBilled
        )
    {
        Listing storage L = listings[listingId];
        return (
            L.lister,
            L.provider,
            L.kind,
            L.title,
            L.description,
            L.priceMicroCredits,
            L.ciphertextHash,
            L.active,
            L.totalCalls,
            L.totalMicroBilled
        );
    }
}
