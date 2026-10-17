// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAegisPolicy} from "./interfaces/IAegisPolicy.sol";

/**
 * @title AegisVault
 * @notice Institutional smart treasury account decoupling autonomous AI perception from deterministic on-chain execution.
 * @dev Enforces strict session key limits, recipient whitelists, target contracts, and selector policies.
 */
contract AegisVault is Ownable, ReentrancyGuard, IAegisPolicy {
    using SafeERC20 for IERC20;

    // Standard ERC20 function selectors
    bytes4 private constant SELECTOR_ERC20_TRANSFER = 0xa9059cbb; // transfer(address,uint256)
    bytes4 private constant SELECTOR_ERC20_APPROVE = 0x095ea7b3;  // approve(address,uint256)

    // MilestoneEscrow function selectors
    // createEscrow(address,address,uint256,uint16,address,bytes32,uint256)
    bytes4 private constant SELECTOR_CREATE_ESCROW = 0x0a1d5e6d;
    // settleEscrow(bytes32,bytes32)
    bytes4 private constant SELECTOR_SETTLE_ESCROW = 0xb20616e0;
    // refundEscrow(bytes32)
    bytes4 private constant SELECTOR_REFUND_ESCROW = 0x47aed508;

    SessionPolicy public policy;

    mapping(address => bool) public isRecipientWhitelisted;
    mapping(address => bool) public isTargetWhitelisted;
    mapping(bytes4 => bool) public isSelectorWhitelisted;

    // Track accumulated tax reserves held in vault
    uint256 public taxReserveBalance;

    event TaxReserveFunded(uint256 amount, uint256 newBalance);
    event TaxReserveWithdrawn(address indexed recipient, uint256 amount);
    event NativeReceived(address indexed sender, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    // =========================================================================
    // POLICY MANAGEMENT (OWNER ONLY)
    // =========================================================================

    /**
     * @notice Configures or updates the session policy for the AI Agent
     * @param agent Address of the delegated AI Agent session key
     * @param maxPerTx Max spending limit per individual transaction
     * @param maxDaily Max spending limit per 24-hour rolling window
     * @param validityDuration Duration in seconds the policy is active for
     * @param taxReserveBps Tax withholding rate in basis points (100 = 1%)
     * @param taxReserveWallet Destination wallet for withheld tax reserves
     */
    function setSessionPolicy(
        address agent,
        uint256 maxPerTx,
        uint256 maxDaily,
        uint256 validityDuration,
        uint16 taxReserveBps,
        address taxReserveWallet
    ) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        if (taxReserveBps > 10000) revert InvalidTaxRate(taxReserveBps);

        policy = SessionPolicy({
            agent: agent,
            maxPerTx: maxPerTx,
            maxDaily: maxDaily,
            currentDailySpent: 0,
            lastDailyReset: block.timestamp,
            validUntil: block.timestamp + validityDuration,
            taxReserveBps: taxReserveBps,
            taxReserveWallet: taxReserveWallet == address(0) ? address(this) : taxReserveWallet,
            isActive: true
        });

        emit PolicyUpdated(
            agent,
            maxPerTx,
            maxDaily,
            policy.validUntil,
            taxReserveBps,
            policy.taxReserveWallet
        );
    }

    function setPolicyActive(bool active) external onlyOwner {
        policy.isActive = active;
    }

    function setRecipientWhitelist(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        isRecipientWhitelisted[recipient] = allowed;
        emit RecipientWhitelisted(recipient, allowed);
    }

    function setRecipientsWhitelistBatch(address[] calldata recipients, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            isRecipientWhitelisted[recipients[i]] = allowed;
            emit RecipientWhitelisted(recipients[i], allowed);
        }
    }

    function setTargetWhitelist(address target, bool allowed) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        isTargetWhitelisted[target] = allowed;
        emit TargetWhitelisted(target, allowed);
    }

    function setTargetsWhitelistBatch(address[] calldata targets, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < targets.length; i++) {
            if (targets[i] == address(0)) revert ZeroAddress();
            isTargetWhitelisted[targets[i]] = allowed;
            emit TargetWhitelisted(targets[i], allowed);
        }
    }

    function setSelectorWhitelist(bytes4 selector, bool allowed) external onlyOwner {
        isSelectorWhitelisted[selector] = allowed;
        emit SelectorWhitelisted(selector, allowed);
    }

    function setSelectorsWhitelistBatch(bytes4[] calldata selectors, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < selectors.length; i++) {
            isSelectorWhitelisted[selectors[i]] = allowed;
            emit SelectorWhitelisted(selectors[i], allowed);
        }
    }

    // =========================================================================
    // EXECUTION ENGINES
    // =========================================================================

    /**
     * @notice Unrestricted execution for Treasury Owner / Admin
     */
    function executeAsOwner(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bytes memory) {
        if (target == address(0)) revert ZeroAddress();
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        if (!success) {
            revert TargetExecutionFailed(returnData);
        }
        return returnData;
    }

    /**
     * @notice Delegated execution for the AI Agent session key, bound by on-chain guardrails.
     * @dev Enforces validity window, target whitelist, selector whitelist, spend limits, and recipient whitelist.
     */
    function executeAsAgent(
        address target,
        uint256 value,
        bytes calldata data
    ) external nonReentrant returns (bytes memory) {
        // 1. Authenticate caller
        if (msg.sender != policy.agent) {
            revert UnauthorizedAgent(msg.sender);
        }
        if (!policy.isActive) {
            revert PolicyInactive();
        }
        if (block.timestamp > policy.validUntil) {
            revert PolicyExpired(policy.validUntil, block.timestamp);
        }

        // 2. Validate Target
        if (!isTargetWhitelisted[target]) {
            emit AgentExecutionBlocked(msg.sender, target, bytes4(data[:4]), "Target not whitelisted");
            revert TargetNotWhitelisted(target);
        }

        // 3. Validate Function Selector
        if (data.length < 4) {
            revert SelectorNotAllowed(bytes4(0));
        }
        bytes4 selector = bytes4(data[:4]);
        if (!isSelectorWhitelisted[selector]) {
            emit AgentExecutionBlocked(msg.sender, target, selector, "Selector not allowed");
            revert SelectorNotAllowed(selector);
        }

        // 4. Rolling 24h reset check
        if (block.timestamp >= policy.lastDailyReset + 1 days) {
            policy.currentDailySpent = 0;
            policy.lastDailyReset = block.timestamp;
        }

        // 5. Inspect call calldata for spending & recipient guardrails
        _enforcePolicyRules(target, value, selector, data);

        // 6. Execute external call
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        if (!success) {
            emit AgentExecutionBlocked(msg.sender, target, selector, "Execution reverted on target");
            revert TargetExecutionFailed(returnData);
        }

        emit AgentExecutionSucceeded(msg.sender, target, value, data, returnData);
        return returnData;
    }

    /**
     * @dev Internal helper enforcing spending limits and recipient whitelisting
     */
    function _enforcePolicyRules(
        address /* target */,
        uint256 value,
        bytes4 selector,
        bytes calldata data
    ) internal {
        // Enforce native ETH spend limits if value > 0
        if (value > 0) {
            _checkAndUpdateSpend(value);
        }

        // Inspect ERC20 transfer(address to, uint256 amount)
        if (selector == SELECTOR_ERC20_TRANSFER) {
            (address to, uint256 amount) = abi.decode(data[4:], (address, uint256));
            if (!isRecipientWhitelisted[to]) {
                revert RecipientNotWhitelisted(to);
            }
            _checkAndUpdateSpend(amount);
        }
        // Inspect ERC20 approve(address spender, uint256 amount)
        else if (selector == SELECTOR_ERC20_APPROVE) {
            (address spender, uint256 amount) = abi.decode(data[4:], (address, uint256));
            // Strict defense: Infinite approvals are explicitly forbidden
            if (amount == type(uint256).max || amount > policy.maxDaily * 10) {
                revert InfiniteApprovalForbidden();
            }
            // Spender must be an approved whitelisted target (e.g. MilestoneEscrow)
            if (!isTargetWhitelisted[spender]) {
                revert TargetNotWhitelisted(spender);
            }
            if (amount > policy.maxPerTx) {
                revert SpendLimitExceeded(amount, policy.maxPerTx);
            }
        }
        // Inspect MilestoneEscrow createEscrow(...)
        else if (selector == SELECTOR_CREATE_ESCROW) {
            (
                address contractor,
                ,
                uint256 amount,
                ,
                ,
                ,
                
            ) = abi.decode(data[4:], (address, address, uint256, uint16, address, bytes32, uint256));

            if (!isRecipientWhitelisted[contractor]) {
                revert RecipientNotWhitelisted(contractor);
            }
            _checkAndUpdateSpend(amount);
        }
    }

    /**
     * @dev Checks per-tx limit and daily cumulative limit, then updates currentDailySpent
     */
    function _checkAndUpdateSpend(uint256 amount) internal {
        if (amount > policy.maxPerTx) {
            revert SpendLimitExceeded(amount, policy.maxPerTx);
        }
        if (policy.currentDailySpent + amount > policy.maxDaily) {
            revert DailyLimitExceeded(amount, policy.maxDaily - policy.currentDailySpent);
        }
        policy.currentDailySpent += amount;
    }

    // =========================================================================
    // TAX RESERVE ACCOUNTING
    // =========================================================================

    /**
     * @notice Records an incoming tax reserve allocation inside the vault
     */
    function recordTaxReserveDeposit(uint256 amount) external {
        taxReserveBalance += amount;
        emit TaxReserveFunded(amount, taxReserveBalance);
    }

    /**
     * @notice Allows owner to transfer tax reserves to official tax authority/bank account
     */
    function withdrawTaxReserve(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        require(amount <= taxReserveBalance, "Amount exceeds tax reserve balance");
        taxReserveBalance -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit TaxReserveWithdrawn(to, amount);
    }

    // =========================================================================
    // VIEW HELPERS
    // =========================================================================

    function getAvailableDailyLimit() external view returns (uint256) {
        if (block.timestamp >= policy.lastDailyReset + 1 days) {
            return policy.maxDaily;
        }
        if (policy.currentDailySpent >= policy.maxDaily) {
            return 0;
        }
        return policy.maxDaily - policy.currentDailySpent;
    }
}
