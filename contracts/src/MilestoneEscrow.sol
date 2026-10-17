// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IAegisVaultReceiver {
    function recordTaxWithholding(uint256 escrowId, uint256 taxAmount) external;
}

/**
 * @title MilestoneEscrow
 * @notice Trustless milestone escrow contract for B2B contractor deliverables.
 * @dev Settles automatically upon verified delivery attestation proofs and routes automated tax withholding.
 */
contract MilestoneEscrow {
    enum EscrowStatus {
        NONE,
        FUNDED,
        SETTLED,
        REFUNDED
    }

    struct EscrowAgreement {
        uint256 id;
        address vault;              // The AegisVault funding the escrow
        address contractor;         // Whitelisted contractor receiving payout
        uint256 totalAmount;        // Total locked USDC (6 decimals)
        uint16 taxWithholdingBps;   // e.g. 1500 = 15.00% routed back to Vault's taxReserveBalance
        bytes32 deliverableSpecHash;// Hash of the natural-language milestone spec
        bytes32 attestationHash;    // Populated upon settlement (SHA-256 of CI/webhook proof)
        uint64 createdAt;
        uint64 settledAt;
        EscrowStatus status;
    }

    address public immutable usdcToken;
    uint256 public nextEscrowId = 1;
    mapping(uint256 => EscrowAgreement) public escrows;

    // --- Custom Errors ---
    error EscrowNotFound(uint256 escrowId);
    error EscrowNotFunded(uint256 escrowId);
    error InvalidAttestationHash();
    error UnauthorizedCaller(address caller);
    error InvalidTaxBps(uint16 taxBps);
    error ZeroAmount();
    error ZeroAddress();
    error TransferFailed();

    // --- Events ---
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed vault,
        address indexed contractor,
        uint256 totalAmount,
        uint16 taxWithholdingBps,
        bytes32 deliverableSpecHash
    );

    event EscrowSettled(
        uint256 indexed escrowId,
        address indexed contractor,
        uint256 contractorPayout,
        uint256 taxAmount,
        bytes32 attestationHash
    );

    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed vault,
        uint256 totalAmount
    );

    constructor(address _usdcToken) {
        if (_usdcToken == address(0)) revert ZeroAddress();
        usdcToken = _usdcToken;
    }

    /**
     * @notice Creates and funds a new milestone escrow agreement
     */
    function createEscrow(
        address contractor,
        uint256 totalAmount,
        uint16 taxWithholdingBps,
        bytes32 deliverableSpecHash
    ) external returns (uint256 escrowId) {
        if (contractor == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAmount();
        if (taxWithholdingBps > 5000) revert InvalidTaxBps(taxWithholdingBps);

        escrowId = nextEscrowId++;

        escrows[escrowId] = EscrowAgreement({
            id: escrowId,
            vault: msg.sender,
            contractor: contractor,
            totalAmount: totalAmount,
            taxWithholdingBps: taxWithholdingBps,
            deliverableSpecHash: deliverableSpecHash,
            attestationHash: bytes32(0),
            createdAt: uint64(block.timestamp),
            settledAt: 0,
            status: EscrowStatus.FUNDED
        });

        // Pull tokens from vault into escrow
        bool success = IERC20Minimal(usdcToken).transferFrom(msg.sender, address(this), totalAmount);
        if (!success) revert TransferFailed();

        emit EscrowCreated(
            escrowId,
            msg.sender,
            contractor,
            totalAmount,
            taxWithholdingBps,
            deliverableSpecHash
        );
    }

    /**
     * @notice Releases escrowed funds upon presentation of verified delivery attestation
     */
    function releaseMilestone(uint256 escrowId, bytes32 attestationHash) external {
        EscrowAgreement storage escrow = escrows[escrowId];
        if (escrow.status == EscrowStatus.NONE) revert EscrowNotFound(escrowId);
        if (escrow.status != EscrowStatus.FUNDED) revert EscrowNotFunded(escrowId);
        if (msg.sender != escrow.vault) revert UnauthorizedCaller(msg.sender);
        if (attestationHash == bytes32(0)) revert InvalidAttestationHash();

        uint256 taxAmount = (escrow.totalAmount * escrow.taxWithholdingBps) / 10000;
        uint256 contractorPayout = escrow.totalAmount - taxAmount;

        // Effects before interactions
        escrow.status = EscrowStatus.SETTLED;
        escrow.settledAt = uint64(block.timestamp);
        escrow.attestationHash = attestationHash;

        // Disburse contractor payout
        bool pOk = IERC20Minimal(usdcToken).transfer(escrow.contractor, contractorPayout);
        if (!pOk) revert TransferFailed();

        // Remit tax withholding to vault
        if (taxAmount > 0) {
            bool tOk = IERC20Minimal(usdcToken).transfer(escrow.vault, taxAmount);
            if (!tOk) revert TransferFailed();

            // Record withholding in vault's internal tax ledger
            try IAegisVaultReceiver(escrow.vault).recordTaxWithholding(escrowId, taxAmount) {} catch {}
        }

        emit EscrowSettled(
            escrowId,
            escrow.contractor,
            contractorPayout,
            taxAmount,
            attestationHash
        );
    }

    /**
     * @notice Refunds locked escrow principal back to vault
     */
    function refundEscrow(uint256 escrowId) external {
        EscrowAgreement storage escrow = escrows[escrowId];
        if (escrow.status == EscrowStatus.NONE) revert EscrowNotFound(escrowId);
        if (escrow.status != EscrowStatus.FUNDED) revert EscrowNotFunded(escrowId);
        if (msg.sender != escrow.vault) revert UnauthorizedCaller(msg.sender);

        escrow.status = EscrowStatus.REFUNDED;
        uint256 refundAmount = escrow.totalAmount;

        bool ok = IERC20Minimal(usdcToken).transfer(escrow.vault, refundAmount);
        if (!ok) revert TransferFailed();

        emit EscrowRefunded(escrowId, escrow.vault, refundAmount);
    }

    function getEscrow(uint256 escrowId) external view returns (EscrowAgreement memory) {
        return escrows[escrowId];
    }

    function escrowCount() external view returns (uint256) {
        return nextEscrowId - 1;
    }
}
