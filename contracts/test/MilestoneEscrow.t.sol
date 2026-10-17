// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AegisVault} from "../src/AegisVault.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract MilestoneEscrowTest is Test {
    MockUSDC public usdc;
    AegisVault public vault;
    MilestoneEscrow public escrow;

    address public owner = address(0x1111);
    address public agent = address(0x2222);
    address public contractor = address(0x3333);
    address public payer = address(0x4444);

    bytes32 public expectedAttestation = keccak256("GITHUB_CI_RUN_SUCCESS_BUILD_94827");
    uint256 public constant ESCROW_AMOUNT = 1_200 * 1e6; // 1,200 USDC
    uint16 public constant TAX_BPS = 1500;               // 15% (180 USDC)

    bytes4 private constant SELECTOR_ERC20_TRANSFER = 0xa9059cbb;
    bytes4 private constant SELECTOR_ERC20_APPROVE = 0x095ea7b3;
    bytes4 private constant SELECTOR_CREATE_ESCROW = 0x0a1d5e6d;
    bytes4 private constant SELECTOR_SETTLE_ESCROW = 0xb20616e0;
    bytes4 private constant SELECTOR_REFUND_ESCROW = 0x47aed508;

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockUSDC();
        vault = new AegisVault(owner);
        escrow = new MilestoneEscrow();

        // Seed payer with 10,000 USDC
        usdc.mint(payer, 10_000 * 1e6);
        // Seed vault with 50,000 USDC
        usdc.mint(address(vault), 50_000 * 1e6);

        // Configure Vault Policy for Agent
        vault.setSessionPolicy(
            agent,
            1_500 * 1e6, // max per-tx 1,500 USDC
            3_000 * 1e6, // max daily 3,000 USDC
            7 days,
            TAX_BPS,
            address(vault)
        );

        vault.setRecipientWhitelist(contractor, true);
        vault.setRecipientWhitelist(address(escrow), true);

        vault.setTargetWhitelist(address(usdc), true);
        vault.setTargetWhitelist(address(escrow), true);

        vault.setSelectorWhitelist(SELECTOR_ERC20_TRANSFER, true);
        vault.setSelectorWhitelist(SELECTOR_ERC20_APPROVE, true);
        vault.setSelectorWhitelist(SELECTOR_CREATE_ESCROW, true);
        vault.setSelectorWhitelist(SELECTOR_SETTLE_ESCROW, true);
        vault.setSelectorWhitelist(SELECTOR_REFUND_ESCROW, true);

        vm.stopPrank();
    }

    // =========================================================================
    // 1. BASIC ESCROW CREATION & SETTLEMENT
    // =========================================================================

    function test_CreateEscrow_Success() public {
        vm.startPrank(payer);
        usdc.approve(address(escrow), ESCROW_AMOUNT);

        bytes32 escrowId = escrow.createEscrow(
            contractor,
            address(usdc),
            ESCROW_AMOUNT,
            TAX_BPS,
            address(vault),
            expectedAttestation,
            3 days
        );
        vm.stopPrank();

        MilestoneEscrow.Escrow memory item = escrow.getEscrow(escrowId);
        assertEq(item.payer, payer);
        assertEq(item.contractor, contractor);
        assertEq(item.amount, ESCROW_AMOUNT);
        assertEq(item.taxReserveBps, TAX_BPS);
        assertEq(item.taxReserveWallet, address(vault));
        assertEq(item.attestationHash, expectedAttestation);
        assertEq(uint256(item.status), uint256(MilestoneEscrow.EscrowStatus.Created));
        assertEq(usdc.balanceOf(address(escrow)), ESCROW_AMOUNT);
    }

    function test_SettleEscrow_AttestationMatch_Success() public {
        vm.startPrank(payer);
        usdc.approve(address(escrow), ESCROW_AMOUNT);
        bytes32 escrowId = escrow.createEscrow(
            contractor,
            address(usdc),
            ESCROW_AMOUNT,
            TAX_BPS,
            address(vault),
            expectedAttestation,
            3 days
        );
        vm.stopPrank();

        uint256 initialContractorBalance = usdc.balanceOf(contractor);
        uint256 initialVaultBalance = usdc.balanceOf(address(vault));
        uint256 initialTaxReserveBalance = vault.taxReserveBalance();

        // Settle with matching attestation
        escrow.settleEscrow(escrowId, expectedAttestation);

        // Expected payouts:
        // 1,200 * 15% = 180 USDC to Tax Reserve
        // 1,200 - 180 = 1,020 USDC to Contractor
        uint256 expectedTax = 180 * 1e6;
        uint256 expectedContractor = 1_020 * 1e6;

        assertEq(usdc.balanceOf(contractor), initialContractorBalance + expectedContractor);
        assertEq(usdc.balanceOf(address(vault)), initialVaultBalance + expectedTax);
        assertEq(vault.taxReserveBalance(), initialTaxReserveBalance + expectedTax);

        MilestoneEscrow.Escrow memory item = escrow.getEscrow(escrowId);
        assertEq(uint256(item.status), uint256(MilestoneEscrow.EscrowStatus.Settled));
    }

    function test_SettleEscrow_InvalidAttestation_Reverts() public {
        vm.startPrank(payer);
        usdc.approve(address(escrow), ESCROW_AMOUNT);
        bytes32 escrowId = escrow.createEscrow(
            contractor,
            address(usdc),
            ESCROW_AMOUNT,
            TAX_BPS,
            address(vault),
            expectedAttestation,
            3 days
        );
        vm.stopPrank();

        bytes32 fraudulentAttestation = keccak256("FAKE_ATTACK_CI_PASS");

        vm.expectRevert(
            abi.encodeWithSelector(
                MilestoneEscrow.InvalidAttestation.selector,
                fraudulentAttestation,
                expectedAttestation
            )
        );
        escrow.settleEscrow(escrowId, fraudulentAttestation);
    }

    function test_RefundEscrow_AfterDeadline_Success() public {
        vm.startPrank(payer);
        usdc.approve(address(escrow), ESCROW_AMOUNT);
        bytes32 escrowId = escrow.createEscrow(
            contractor,
            address(usdc),
            ESCROW_AMOUNT,
            TAX_BPS,
            address(vault),
            expectedAttestation,
            3 days
        );

        // Before deadline -> reverts
        vm.expectRevert(
            abi.encodeWithSelector(
                MilestoneEscrow.EscrowDeadlineNotPassed.selector,
                block.timestamp,
                block.timestamp + 3 days
            )
        );
        escrow.refundEscrow(escrowId);

        // Warp past deadline
        vm.warp(block.timestamp + 3 days + 1);

        // Refund succeeds
        escrow.refundEscrow(escrowId);
        vm.stopPrank();

        MilestoneEscrow.Escrow memory item = escrow.getEscrow(escrowId);
        assertEq(uint256(item.status), uint256(MilestoneEscrow.EscrowStatus.Refunded));
        assertEq(usdc.balanceOf(payer), 10_000 * 1e6);
    }

    // =========================================================================
    // 2. END-TO-END AUTONOMOUS AGENT SETTLEMENT VIA AEGISVAULT
    // =========================================================================

    function test_EndToEndAutonomousAgentSettlement() public {
        // Step 1: Agent approves exact escrow amount from Vault to MilestoneEscrow
        vm.startPrank(agent);
        bytes memory approveData = abi.encodeWithSelector(
            SELECTOR_ERC20_APPROVE,
            address(escrow),
            ESCROW_AMOUNT
        );
        vault.executeAsAgent(address(usdc), 0, approveData);

        // Step 2: Agent creates escrow locking 1,200 USDC from Vault
        bytes memory createEscrowData = abi.encodeWithSelector(
            SELECTOR_CREATE_ESCROW,
            contractor,
            address(usdc),
            ESCROW_AMOUNT,
            TAX_BPS,
            address(vault),
            expectedAttestation,
            7 days
        );
        bytes memory returnData = vault.executeAsAgent(address(escrow), 0, createEscrowData);
        bytes32 escrowId = abi.decode(returnData, (bytes32));

        // Verify Vault balance decreased by 1,200 USDC and escrow holds 1,200 USDC
        assertEq(usdc.balanceOf(address(vault)), (50_000 - 1_200) * 1e6);
        assertEq(usdc.balanceOf(address(escrow)), 1_200 * 1e6);

        // Step 3: Perception trigger - CI/CD passes, Agent presents valid attestation to settle
        bytes memory settleData = abi.encodeWithSelector(
            SELECTOR_SETTLE_ESCROW,
            escrowId,
            expectedAttestation
        );
        vault.executeAsAgent(address(escrow), 0, settleData);
        vm.stopPrank();

        // Step 4: Verification of 85% / 15% split
        // Contractor receives 1,020 USDC
        assertEq(usdc.balanceOf(contractor), 1_020 * 1e6);
        // Vault Tax Reserve receives 180 USDC
        assertEq(vault.taxReserveBalance(), 180 * 1e6);
        // Vault total balance is 50,000 - 1,200 + 180 = 48,980 USDC
        assertEq(usdc.balanceOf(address(vault)), 48_980 * 1e6);
        // Escrow balance is 0
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
