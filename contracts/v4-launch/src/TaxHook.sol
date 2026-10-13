// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {TransientStateLibrary} from "@uniswap/v4-core/src/libraries/TransientStateLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TaxHook
/// @notice The token and its Uniswap v4 hook in one contract, so the token has a single address.
/// The ERC20 side is plain: fixed supply, no transfer tax, no blacklist, no mint after deploy.
/// The hook side serves one ETH/token pool:
///  - takes a buy tax and a sell tax, always in ETH, for every swap route (exact in / exact out);
///  - is the only address that can create the pool, and creates it with token-only liquidity in one tx;
///  - is the only liquidity provider, so nobody can trade through the pool with taxless range orders;
///  - owns that liquidity forever (there is no function that removes it);
///  - can only ever lower the taxes, never raise them, and never block a trade.
/// Taxes accrue as PoolManager ERC-6909 claims and the owner or treasury sweeps them to the treasury, so a
/// treasury that rejects ETH can never make swaps fail.
contract TaxHook is ERC20, BaseHook, IUnlockCallback {
    using SafeCast for uint256;
    using CurrencyLibrary for Currency;
    using TransientStateLibrary for IPoolManager;

    uint16 public constant MAX_TAX_BPS = 300;
    uint16 internal constant BPS = 10_000;
    int24 public constant TICK_SPACING = 200;
    Currency internal constant ETH = Currency.wrap(address(0));

    address public owner;
    address public pendingOwner;
    address public treasury;
    uint16 public buyTaxBps;
    uint16 public sellTaxBps;

    /// @notice The contract that deployed this one; it may call `launch` in the same transaction.
    address public immutable launcher;

    bool public launched;
    int24 public launchTick;
    uint128 public lockedLiquidity;

    enum Action {
        Launch,
        Sweep
    }

    event Launched(int24 startTick, uint128 liquidity, uint256 devBuyEth);
    event Taxed(bool indexed isBuy, uint256 ethAmount);
    event TaxesSwept(address indexed treasury, uint256 ethAmount);
    event TaxesLowered(uint16 buyTaxBps, uint16 sellTaxBps);
    event TreasuryChanged(address treasury);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error AlreadyLaunched();
    error NotLaunched();
    error PoolCreationLocked();
    error LiquidityLocked();
    error NotPendingOwner();
    error NotAuthorized();
    error TaxTooHigh();
    error TaxCanOnlyGoDown();
    error ZeroAddress();
    error BadStartTick();
    error NoTokens();
    error EthRefundFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        IPoolManager manager,
        string memory name_,
        string memory symbol_,
        uint256 supply,
        address owner_,
        address treasury_,
        uint16 buyTaxBps_,
        uint16 sellTaxBps_
    ) ERC20(name_, symbol_) BaseHook(manager) {
        if (owner_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (buyTaxBps_ > MAX_TAX_BPS || sellTaxBps_ > MAX_TAX_BPS) revert TaxTooHigh();
        launcher = msg.sender;
        _mint(address(this), supply);
        owner = owner_;
        treasury = treasury_;
        buyTaxBps = buyTaxBps_;
        sellTaxBps = sellTaxBps_;
        emit OwnershipTransferred(address(0), owner_);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory permissions) {
        permissions.beforeInitialize = true;
        permissions.beforeAddLiquidity = true;
        permissions.beforeSwap = true;
        permissions.afterSwap = true;
        permissions.beforeSwapReturnDelta = true;
        permissions.afterSwapReturnDelta = true;
    }

    /// @notice The single ETH/token pool this hook serves.
    function poolKey() public view returns (PoolKey memory) {
        return PoolKey({
            currency0: ETH,
            currency1: Currency.wrap(address(this)),
            fee: 0,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(this))
        });
    }

    // ---------------------------------------------------------------------
    // Launch: create pool + add token-only liquidity + optional dev buy, one transaction
    // ---------------------------------------------------------------------

    /// @notice Creates the pool at `startTick` and locks this contract's entire token balance as liquidity.
    /// The range runs from `startTick` up to the maximum token price, so it holds only tokens at launch.
    /// Any ETH sent is a dev buy executed in the same transaction, before anyone else can trade.
    /// Bought tokens and any refund go to the owner, whether the owner or the launcher calls this.
    function launch(int24 startTick) external payable {
        if (msg.sender != owner && msg.sender != launcher) revert NotOwner();
        if (launched) revert AlreadyLaunched();
        if (startTick % TICK_SPACING != 0 || startTick <= TickMath.minUsableTick(TICK_SPACING)) revert BadStartTick();
        uint256 amount = balanceOf(address(this));
        if (amount == 0) revert NoTokens();

        launched = true;
        launchTick = startTick;
        address recipient = owner;

        uint160 sqrtStart = TickMath.getSqrtPriceAtTick(startTick);
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        uint128 liquidity =
            LiquidityAmounts.getLiquidityForAmount1(TickMath.getSqrtPriceAtTick(tickLower), sqrtStart, amount);
        lockedLiquidity = liquidity;

        poolManager.initialize(poolKey(), sqrtStart);
        poolManager.unlock(abi.encode(Action.Launch, abi.encode(tickLower, startTick, liquidity, msg.value, recipient)));

        uint256 dust = balanceOf(address(this));
        if (dust > 0) _transfer(address(this), recipient, dust);
        uint256 leftoverEth = address(this).balance;
        if (leftoverEth > 0) {
            (bool ok,) = recipient.call{value: leftoverEth}("");
            if (!ok) revert EthRefundFailed();
        }

        emit Launched(startTick, liquidity, msg.value);
    }

    // ---------------------------------------------------------------------
    // Tax collection
    // ---------------------------------------------------------------------

    /// @notice Taxes collected so far and not yet swept, in wei.
    function pendingTaxes() public view returns (uint256) {
        return poolManager.balanceOf(address(this), ETH.toId());
    }

    /// @notice Sends all collected tax to the treasury. Only the owner or the treasury can call it;
    /// the treasury keeps this right after ownership is renounced, so taxes can always be claimed.
    function sweepTaxes() external returns (uint256 amount) {
        if (msg.sender != owner && msg.sender != treasury) revert NotAuthorized();
        amount = pendingTaxes();
        if (amount == 0) return 0;
        poolManager.unlock(abi.encode(Action.Sweep, abi.encode(amount)));
        emit TaxesSwept(treasury, amount);
    }

    function unlockCallback(bytes calldata data) external onlyPoolManager returns (bytes memory) {
        (Action action, bytes memory inner) = abi.decode(data, (Action, bytes));
        if (action == Action.Launch) {
            _addLiquidityAndDevBuy(inner);
        } else {
            uint256 amount = abi.decode(inner, (uint256));
            poolManager.burn(address(this), ETH.toId(), amount);
            poolManager.take(ETH, treasury, amount);
        }
        return "";
    }

    function _addLiquidityAndDevBuy(bytes memory inner) internal {
        (int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 devBuyEth, address buyer) =
            abi.decode(inner, (int24, int24, uint128, uint256, address));
        PoolKey memory key = poolKey();

        poolManager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            ""
        );

        if (devBuyEth > 0) {
            poolManager.swap(
                key,
                SwapParams({
                    zeroForOne: true,
                    amountSpecified: -int256(devBuyEth),
                    sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
                }),
                ""
            );
        }

        _settleOrTake(ETH, buyer);
        _settleOrTake(key.currency1, buyer);
    }

    function _settleOrTake(Currency currency, address to) internal {
        int256 delta = poolManager.currencyDelta(address(this), currency);
        if (delta < 0) {
            uint256 owed = uint256(-delta);
            if (currency.isAddressZero()) {
                poolManager.settle{value: owed}();
            } else {
                poolManager.sync(currency);
                _transfer(address(this), address(poolManager), owed);
                poolManager.settle();
            }
        } else if (delta > 0) {
            poolManager.take(currency, to, uint256(delta));
        }
    }

    // ---------------------------------------------------------------------
    // Hook callbacks
    // ---------------------------------------------------------------------

    /// @dev The PoolManager skips this callback when the hook itself initializes, so every call that
    /// reaches here comes from someone else trying to create a pool with this hook.
    function _beforeInitialize(address, PoolKey calldata, uint160) internal pure override returns (bytes4) {
        revert PoolCreationLocked();
    }

    /// @dev Same self-call rule: only the launch adds liquidity. Outside positions would act as
    /// range orders that buy or sell through the pool without ever paying the swap tax.
    function _beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        pure
        override
        returns (bytes4)
    {
        revert LiquidityLocked();
    }

    /// @dev Handles the routes where ETH is the amount the trader fixed:
    /// buy with exact ETH in, and sell for exact ETH out.
    function _beforeSwap(address, PoolKey calldata, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        bool exactInput = params.amountSpecified < 0;
        if (params.zeroForOne != exactInput) {
            return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        uint256 tax;
        if (exactInput) {
            tax = uint256(-params.amountSpecified) * buyTaxBps / BPS;
        } else {
            tax = uint256(params.amountSpecified) * sellTaxBps / (BPS - sellTaxBps);
        }
        if (tax == 0) return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);

        poolManager.mint(address(this), ETH.toId(), tax);
        emit Taxed(params.zeroForOne, tax);
        return (IHooks.beforeSwap.selector, toBeforeSwapDelta(tax.toInt128(), 0), 0);
    }

    /// @dev Handles the routes where ETH is the other side of the trade:
    /// buy for exact tokens out, and sell exact tokens in.
    function _afterSwap(address, PoolKey calldata, SwapParams calldata params, BalanceDelta delta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        bool exactInput = params.amountSpecified < 0;
        if (params.zeroForOne == exactInput) return (IHooks.afterSwap.selector, 0);

        int128 ethDelta = delta.amount0();
        uint256 tax;
        if (params.zeroForOne) {
            tax = uint256(uint128(-ethDelta)) * buyTaxBps / (BPS - buyTaxBps);
        } else {
            tax = uint256(uint128(ethDelta)) * sellTaxBps / BPS;
        }
        if (tax == 0) return (IHooks.afterSwap.selector, 0);

        poolManager.mint(address(this), ETH.toId(), tax);
        emit Taxed(params.zeroForOne, tax);
        return (IHooks.afterSwap.selector, tax.toInt128());
    }

    // ---------------------------------------------------------------------
    // Owner controls (deliberately minimal)
    // ---------------------------------------------------------------------

    function lowerTaxes(uint16 newBuyTaxBps, uint16 newSellTaxBps) external onlyOwner {
        if (newBuyTaxBps > buyTaxBps || newSellTaxBps > sellTaxBps) revert TaxCanOnlyGoDown();
        buyTaxBps = newBuyTaxBps;
        sellTaxBps = newSellTaxBps;
        emit TaxesLowered(newBuyTaxBps, newSellTaxBps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryChanged(newTreasury);
    }

    /// @notice Step one of two: the new owner must call `acceptOwnership`.
    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    /// @notice Gives up owner powers for good. Taxes stay as they are and the treasury stays fixed.
    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
        pendingOwner = address(0);
    }
}
