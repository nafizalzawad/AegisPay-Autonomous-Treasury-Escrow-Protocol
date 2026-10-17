// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IAegisPolicy} from "./interfaces/IAegisPolicy.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IMilestoneEscrow {
    function createEscrow(
        address contractor,
        uint256 totalAmount,
        uint16 taxWithholdingBps,
        bytes32 deliverableSpecHash
    ) external returns (uint256 escrowId);

    function releaseMilestone(uint256 escrowId, bytes32 attestationHash) external;
}

/**
 * @title AegisVault
 * @notice Institutional ERC-4337 compatible smart account with deterministic session-key guardrails and tax reserve isolation.
 */
contract AegisVault is IAegisPolicy {
    address public owner;
    address public entryPoint;
    address public immutable usdcToken;
    uint256 public taxReserveBalance;
    uint256 public nonce;

    mapping(address => SessionKeyPolicy) public sessionPolicies;
    mapping(address => bool) public whitelistedRecipients;
    mapping(address => mapping(bytes4 => bool)) public allowedTargetSelectors;

    // Standard ERC-20 selectors
    bytes4 private constant SELECTOR_ERC20_TRANSFER = 0xa9059cbb; // transfer(address,uint256)
    bytes4 private constant SELECTOR_ERC20_APPROVE  = 0x095ea7b3; // approve(address,uint256)

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller(msg.sender);
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != entryPoint) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    constructor(address _owner, address _entryPoint, address _usdcToken) {
        if (_owner == address(0)) revert UnauthorizedCaller(address(0));
        owner = _owner;
        entryPoint = _entryPoint;
        usdcToken = _usdcToken;
    }

    receive() external payable {}
    fallback() external payable {}

    // =========================================================================
    // POLICY MANAGEMENT (OWNER ONLY)
    // =========================================================================

    function configureSessionKey(
        address sessionKey,
        uint64 expiresAt,
        uint256 maxPerTx,
        uint256 maxPerDay
    ) external onlyOwner {
        if (sessionKey == address(0)) revert UnauthorizedCaller(address(0));
        sessionPolicies[sessionKey] = SessionKeyPolicy({
            isActive: true,
            expiresAt: expiresAt,
            maxAmountPerTx: maxPerTx,
            maxAmountPerDay: maxPerDay,
            spentToday: 0,
            lastResetTimestamp: uint64(block.timestamp)
        });

        emit PolicyConfigured(sessionKey, expiresAt, maxPerTx, maxPerDay);
    }

    function revokeSessionKey(address sessionKey) external onlyOwner {
        sessionPolicies[sessionKey].isActive = false;
        emit SessionKeyRevoked(sessionKey);
    }

    function setRecipientWhitelist(address recipient, bool allowed) external onlyOwner {
        whitelistedRecipients[recipient] = allowed;
        emit RecipientWhitelistUpdated(recipient, allowed);
    }

    function setAllowedTargetSelector(address target, bytes4 selector, bool allowed) external onlyOwner {
        allowedTargetSelectors[target][selector] = allowed;
        emit TargetSelectorUpdated(target, selector, allowed);
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert UnauthorizedCaller(address(0));
        owner = newOwner;
    }

    function setEntryPoint(address newEntryPoint) external onlyOwner {
        entryPoint = newEntryPoint;
    }

    // =========================================================================
    // TREASURY & TAX ACCOUNTING
    // =========================================================================

    /**
     * @notice Returns unencumbered liquidity available for active operations (excluding tax reserves)
     */
    function operatingBalance() public view returns (uint256) {
        uint256 total = IERC20Minimal(usdcToken).balanceOf(address(this));
        if (total <= taxReserveBalance) {
            return 0;
        }
        return total - taxReserveBalance;
    }

    /**
     * @notice Records an incoming tax withholding deduction
     */
    function recordTaxWithholding(uint256 escrowId, uint256 taxAmount) external {
        taxReserveBalance += taxAmount;
        emit TaxWithheld(escrowId, taxAmount, taxReserveBalance);
    }

    /**
     * @notice Allows owner to remit isolated tax reserves to tax authority
     */
    function withdrawTaxReserve(address to, uint256 amount) external onlyOwner {
        require(amount <= taxReserveBalance, "Exceeds tax reserve balance");
        taxReserveBalance -= amount;
        bool ok = IERC20Minimal(usdcToken).transfer(to, amount);
        if (!ok) revert ExecutionFailed("");
    }

    // =========================================================================
    // EXECUTION ENGINES
    // =========================================================================

    /**
     * @notice Unrestricted execution for Treasury Owner
     */
    function executeByOwner(
        address target,
        bytes calldata data,
        uint256 value
    ) external onlyOwner returns (bytes memory) {
        (bool ok, bytes memory res) = target.call{value: value}(data);
        if (!ok) revert ExecutionFailed(res);
        return res;
    }

    /**
     * @notice Delegated execution for the AI Agent session key.
     * @dev Strictly enforces calldata verification, spend limits, rolling daily caps, and recipient allowlists.
     */
    function executeByAgent(
        address target,
        bytes calldata data,
        address intendedRecipient,
        uint256 spendAmount,
        bytes32 actionRef
    ) external returns (bytes memory) {
        // 1. Authenticate Session Key
        SessionKeyPolicy storage policy = sessionPolicies[msg.sender];
        if (!policy.isActive) {
            revert SessionKeyInactive(msg.sender);
        }
        if (block.timestamp > policy.expiresAt) {
            revert SessionKeyExpired(policy.expiresAt, uint64(block.timestamp));
        }

        // 2. Target Selector Verification
        if (data.length < 4) {
            revert FunctionSelectorNotAllowed(bytes4(0));
        }
        bytes4 sel = bytes4(data[:4]);
        if (!allowedTargetSelectors[target][sel]) {
            revert FunctionSelectorNotAllowed(sel);
        }

        // 3. Calldata Inspection against Argument Spoofing
        if (sel == SELECTOR_ERC20_TRANSFER || sel == SELECTOR_ERC20_APPROVE) {
            (address decodedTarget, uint256 decodedAmount) = abi.decode(data[4:], (address, uint256));
            if (decodedTarget != intendedRecipient) {
                revert RecipientNotWhitelisted(decodedTarget);
            }
            if (decodedAmount != spendAmount) {
                revert PerTxSpendLimitExceeded(decodedAmount, policy.maxAmountPerTx);
            }
        }

        // 4. Financial Guardrails Enforcement
        if (spendAmount > 0) {
            if (!whitelistedRecipients[intendedRecipient]) {
                revert RecipientNotWhitelisted(intendedRecipient);
            }
            if (spendAmount > policy.maxAmountPerTx) {
                revert PerTxSpendLimitExceeded(spendAmount, policy.maxAmountPerTx);
            }

            // Rolling 24-hour reset
            if (block.timestamp >= policy.lastResetTimestamp + 1 days) {
                policy.spentToday = 0;
                policy.lastResetTimestamp = uint64(block.timestamp);
            }

            if (policy.spentToday + spendAmount > policy.maxAmountPerDay) {
                revert DailySpendLimitExceeded(spendAmount, policy.maxAmountPerDay - policy.spentToday);
            }

            // Ensure agent never spends isolated tax reserves
            uint256 opBal = operatingBalance();
            if (spendAmount > opBal) {
                revert PerTxSpendLimitExceeded(spendAmount, opBal);
            }

            policy.spentToday += spendAmount;
        }

        nonce++;

        // 5. Execute on Target
        (bool ok, bytes memory res) = target.call(data);
        if (!ok) {
            revert ExecutionFailed(res);
        }

        emit AgentActionExecuted(
            msg.sender,
            target,
            sel,
            intendedRecipient,
            spendAmount,
            actionRef
        );

        return res;
    }

    /**
     * @notice Atomic helper for Agent to approve and create an escrow in a single transaction
     */
    function createEscrowByAgent(
        address escrowContract,
        address contractor,
        uint256 amount,
        uint16 taxBps,
        bytes32 specHash
    ) external returns (uint256 escrowId) {
        SessionKeyPolicy storage policy = sessionPolicies[msg.sender];
        if (!policy.isActive) revert SessionKeyInactive(msg.sender);
        if (block.timestamp > policy.expiresAt) revert SessionKeyExpired(policy.expiresAt, uint64(block.timestamp));

        bytes4 createSel = IMilestoneEscrow.createEscrow.selector;
        if (!allowedTargetSelectors[escrowContract][createSel]) {
            revert TargetContractNotAllowed(escrowContract);
        }

        if (!whitelistedRecipients[contractor]) {
            revert RecipientNotWhitelisted(contractor);
        }

        if (amount > policy.maxAmountPerTx) {
            revert PerTxSpendLimitExceeded(amount, policy.maxAmountPerTx);
        }

        if (block.timestamp >= policy.lastResetTimestamp + 1 days) {
            policy.spentToday = 0;
            policy.lastResetTimestamp = uint64(block.timestamp);
        }

        if (policy.spentToday + amount > policy.maxAmountPerDay) {
            revert DailySpendLimitExceeded(amount, policy.maxAmountPerDay - policy.spentToday);
        }

        uint256 opBal = operatingBalance();
        if (amount > opBal) {
            revert PerTxSpendLimitExceeded(amount, opBal);
        }

        policy.spentToday += amount;
        nonce++;

        // Approve exact escrow amount
        bool aOk = IERC20Minimal(usdcToken).approve(escrowContract, amount);
        if (!aOk) revert ExecutionFailed("");

        // Call MilestoneEscrow
        escrowId = IMilestoneEscrow(escrowContract).createEscrow(contractor, amount, taxBps, specHash);

        emit AgentActionExecuted(
            msg.sender,
            escrowContract,
            createSel,
            contractor,
            amount,
            specHash
        );
    }

    /**
     * @notice Atomic helper for Agent to settle an escrow upon delivery verification
     */
    function settleEscrowByAgent(
        address escrowContract,
        uint256 escrowId,
        bytes32 attestationHash
    ) external {
        SessionKeyPolicy storage policy = sessionPolicies[msg.sender];
        if (!policy.isActive) revert SessionKeyInactive(msg.sender);
        if (block.timestamp > policy.expiresAt) revert SessionKeyExpired(policy.expiresAt, uint64(block.timestamp));

        bytes4 releaseSel = IMilestoneEscrow.releaseMilestone.selector;
        if (!allowedTargetSelectors[escrowContract][releaseSel]) {
            revert FunctionSelectorNotAllowed(releaseSel);
        }

        nonce++;
        IMilestoneEscrow(escrowContract).releaseMilestone(escrowId, attestationHash);

        emit AgentActionExecuted(
            msg.sender,
            escrowContract,
            releaseSel,
            address(0),
            0,
            attestationHash
        );
    }

    // =========================================================================
    // ERC-4337 COMPATIBILITY
    // =========================================================================

    /**
     * @notice ERC-4337 signature and policy verification hook
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        if (userOp.signature.length != 65) {
            return 1; // SIG_VALIDATION_FAILED
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        bytes memory sig = userOp.signature;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // EIP-191 personal sign recovery
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );
        address signer = ecrecover(ethSignedHash, v, r, s);
        if (signer == address(0)) {
            return 1;
        }

        // Validate signer is owner or active session key
        if (signer != owner) {
            SessionKeyPolicy storage policy = sessionPolicies[signer];
            if (!policy.isActive || block.timestamp > policy.expiresAt) {
                return 1;
            }
        }

        // Pay missing funds to entrypoint if requested
        if (missingAccountFunds > 0 && msg.sender == entryPoint) {
            (bool sent, ) = entryPoint.call{value: missingAccountFunds}("");
            require(sent || !sent); // silence unused variable
        }

        return 0; // SIG_VALIDATION_SUCCESS
    }
}
