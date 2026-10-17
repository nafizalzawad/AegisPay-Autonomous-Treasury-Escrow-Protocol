// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAegisPolicy {
    struct SessionKeyPolicy {
        bool isActive;
        uint64 expiresAt;
        uint256 maxAmountPerTx;      // 6 decimals (e.g. 1500e6)
        uint256 maxAmountPerDay;     // 6 decimals (e.g. 3000e6)
        uint256 spentToday;          // 6 decimals tracked in current 24h window
        uint64 lastResetTimestamp;   // timestamp of current 24h window start
    }

    struct PackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    error UnauthorizedCaller(address caller);
    error SessionKeyInactive(address sessionKey);
    error SessionKeyExpired(uint64 expiresAt, uint64 currentTimestamp);
    error TargetContractNotAllowed(address target);
    error FunctionSelectorNotAllowed(bytes4 selector);
    error RecipientNotWhitelisted(address recipient);
    error PerTxSpendLimitExceeded(uint256 requested, uint256 maxAllowed);
    error DailySpendLimitExceeded(uint256 requested, uint256 remainingToday);
    error InvalidTaxBps(uint16 taxBps);
    error ExecutionFailed(bytes returnData);

    event PolicyConfigured(
        address indexed sessionKey,
        uint64 expiresAt,
        uint256 maxAmountPerTx,
        uint256 maxAmountPerDay
    );
    event SessionKeyRevoked(address indexed sessionKey);
    event RecipientWhitelistUpdated(address indexed recipient, bool allowed);
    event TargetSelectorUpdated(address indexed target, bytes4 indexed selector, bool allowed);
    event AgentActionExecuted(
        address indexed sessionKey,
        address indexed target,
        bytes4 indexed selector,
        address recipient,
        uint256 spendAmount,
        bytes32 actionRef
    );
    event TaxWithheld(uint256 indexed escrowId, uint256 taxAmount, uint256 totalTaxReserve);
}
