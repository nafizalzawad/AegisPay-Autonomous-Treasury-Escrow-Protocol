// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IAegisPolicy
 * @notice Interface and data structures governing Session Key policies and deterministic guardrails.
 */
interface IAegisPolicy {
    struct SessionPolicy {
        address agent;              // Authorized AI agent session key
        uint256 maxPerTx;           // Maximum spending limit per individual transaction (in token units)
        uint256 maxDaily;           // Maximum cumulative spending limit per 24h rolling period
        uint256 currentDailySpent;  // Total spent in the current rolling 24h window
        uint256 lastDailyReset;     // Timestamp marking start of current rolling daily window
        uint256 validUntil;         // Expiration timestamp of the session policy
        uint16 taxReserveBps;       // Automated tax withholding rate in basis points (e.g. 1500 = 15.00%)
        address taxReserveWallet;   // Dedicated tax withholding subaccount or cold vault address
        bool isActive;              // Whether session key delegation is currently enabled
    }

    // --- Custom Errors ---
    error PolicyExpired(uint256 validUntil, uint256 currentTimestamp);
    error SpendLimitExceeded(uint256 requested, uint256 maxPerTx);
    error DailyLimitExceeded(uint256 requested, uint256 availableToday);
    error RecipientNotWhitelisted(address recipient);
    error TargetNotWhitelisted(address target);
    error SelectorNotAllowed(bytes4 selector);
    error InfiniteApprovalForbidden();
    error UnauthorizedAgent(address caller);
    error PolicyInactive();
    error ZeroAddress();
    error InvalidTaxRate(uint256 bps);
    error TargetExecutionFailed(bytes returnData);

    // --- Events ---
    event PolicyUpdated(
        address indexed agent,
        uint256 maxPerTx,
        uint256 maxDaily,
        uint256 validUntil,
        uint16 taxReserveBps,
        address taxReserveWallet
    );
    event RecipientWhitelisted(address indexed recipient, bool allowed);
    event TargetWhitelisted(address indexed target, bool allowed);
    event SelectorWhitelisted(bytes4 indexed selector, bool allowed);
    event AgentExecutionSucceeded(
        address indexed agent,
        address indexed target,
        uint256 value,
        bytes data,
        bytes returnData
    );
    event AgentExecutionBlocked(
        address indexed agent,
        address indexed target,
        bytes4 indexed selector,
        string reason
    );
}
