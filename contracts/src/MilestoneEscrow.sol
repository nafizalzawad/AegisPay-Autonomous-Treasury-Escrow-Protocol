// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAegisVaultReceiver {
    function recordTaxReserveDeposit(uint256 amount) external;
}

/**
 * @title MilestoneEscrow
 * @notice Trustless milestone escrow contract with deterministic CI/CD attestation verification and automated tax splitting.
 */
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum EscrowStatus {
        NonExistent,
        Created,
        Settled,
        Refunded
    }

    struct Escrow {
        bytes32 escrowId;
        address payer;
        address contractor;
        address token;
        uint256 amount;
        uint16 taxReserveBps;
        address taxReserveWallet;
        bytes32 attestationHash;
        EscrowStatus status;
        uint256 createdAt;
        uint256 deadline;
    }

    // Mapping from escrowId => Escrow
    mapping(bytes32 => Escrow) public escrows;
    bytes32[] public allEscrowIds;
    uint256 private nonce;

    // --- Custom Errors ---
    error EscrowNotFound(bytes32 escrowId);
    error EscrowNotActive(bytes32 escrowId, EscrowStatus currentStatus);
    error InvalidAttestation(bytes32 provided, bytes32 expected);
    error EscrowDeadlineNotPassed(uint256 currentTimestamp, uint256 deadline);
    error UnauthorizedCaller(address caller);
    error ZeroAmount();
    error ZeroAddress();
    error InvalidTaxRate(uint16 bps);

    // --- Events ---
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed contractor,
        address token,
        uint256 amount,
        uint16 taxReserveBps,
        address taxReserveWallet,
        bytes32 attestationHash,
        uint256 deadline
    );

    event EscrowSettled(
        bytes32 indexed escrowId,
        uint256 contractorPayout,
        uint256 taxAmount,
        bytes32 deliveryAttestation
    );

    event EscrowRefunded(bytes32 indexed escrowId, uint256 amount);

    /**
     * @notice Locks funds in escrow under a specified delivery attestation hash and tax reserve rate
     */
    function createEscrow(
        address contractor,
        address token,
        uint256 amount,
        uint16 taxReserveBps,
        address taxReserveWallet,
        bytes32 attestationHash,
        uint256 duration
    ) external nonReentrant returns (bytes32 escrowId) {
        if (contractor == address(0) || token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (taxReserveBps > 10000) revert InvalidTaxRate(taxReserveBps);

        escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                contractor,
                token,
                amount,
                block.timestamp,
                nonce++
            )
        );

        address resolvedTaxWallet = taxReserveWallet == address(0) ? msg.sender : taxReserveWallet;

        escrows[escrowId] = Escrow({
            escrowId: escrowId,
            payer: msg.sender,
            contractor: contractor,
            token: token,
            amount: amount,
            taxReserveBps: taxReserveBps,
            taxReserveWallet: resolvedTaxWallet,
            attestationHash: attestationHash,
            status: EscrowStatus.Created,
            createdAt: block.timestamp,
            deadline: block.timestamp + duration
        });

        allEscrowIds.push(escrowId);

        // Pull tokens into escrow
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(
            escrowId,
            msg.sender,
            contractor,
            token,
            amount,
            taxReserveBps,
            resolvedTaxWallet,
            attestationHash,
            block.timestamp + duration
        );

        return escrowId;
    }

    /**
     * @notice Releases escrowed funds upon presentation of valid delivery attestation
     * @dev Automatically calculates and splits contractor payment from tax withholding reserve
     */
    function settleEscrow(
        bytes32 escrowId,
        bytes32 deliveryAttestation
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status == EscrowStatus.NonExistent) {
            revert EscrowNotFound(escrowId);
        }
        if (escrow.status != EscrowStatus.Created) {
            revert EscrowNotActive(escrowId, escrow.status);
        }

        // Verify delivery attestation matches expected hash
        if (deliveryAttestation != escrow.attestationHash) {
            revert InvalidAttestation(deliveryAttestation, escrow.attestationHash);
        }

        // Calculate tax withholding and contractor payout
        uint256 taxAmount = (escrow.amount * escrow.taxReserveBps) / 10000;
        uint256 contractorPayout = escrow.amount - taxAmount;

        // Effects before interactions
        escrow.status = EscrowStatus.Settled;

        // Transfer payout to contractor
        IERC20(escrow.token).safeTransfer(escrow.contractor, contractorPayout);

        // Transfer tax withholding to tax reserve destination
        if (taxAmount > 0) {
            IERC20(escrow.token).safeTransfer(escrow.taxReserveWallet, taxAmount);
            // If recipient implements IAegisVaultReceiver, notify vault
            if (escrow.taxReserveWallet.code.length > 0) {
                try IAegisVaultReceiver(escrow.taxReserveWallet).recordTaxReserveDeposit(taxAmount) {} catch {}
            }
        }

        emit EscrowSettled(escrowId, contractorPayout, taxAmount, deliveryAttestation);
    }

    /**
     * @notice Refunds escrowed funds to payer if deadline has expired or if mutual refund
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status == EscrowStatus.NonExistent) {
            revert EscrowNotFound(escrowId);
        }
        if (escrow.status != EscrowStatus.Created) {
            revert EscrowNotActive(escrowId, escrow.status);
        }

        // Only payer can call refund, and only after deadline
        if (msg.sender != escrow.payer) {
            revert UnauthorizedCaller(msg.sender);
        }
        if (block.timestamp <= escrow.deadline) {
            revert EscrowDeadlineNotPassed(block.timestamp, escrow.deadline);
        }

        uint256 refundAmount = escrow.amount;
        escrow.status = EscrowStatus.Refunded;

        IERC20(escrow.token).safeTransfer(escrow.payer, refundAmount);

        emit EscrowRefunded(escrowId, refundAmount);
    }

    // --- View Functions ---

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getAllEscrowIds() external view returns (bytes32[] memory) {
        return allEscrowIds;
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrowIds.length;
    }
}
