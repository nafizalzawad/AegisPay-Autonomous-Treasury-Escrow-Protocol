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
    address public unauthorized = address(0x4444);

    bytes32 public constant SPEC_HASH = keccak256("Deliver AI Perceptual Settlement Engine");
    bytes32 public constant ATTESTATION_HASH = keccak256("GITHUB_CI_CD_BUILD_RUN_10294_SUCCESS");

    uint256 public constant ESCROW_AMOUNT = 1200 * 1e6; // 1,200 USDC
    uint16 public constant TAX_BPS = 1500;              // 15% (180 USDC)

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockUSDC();
        vault = new AegisVault(owner, address(0), address(usdc));
        escrow = new MilestoneEscrow(address(usdc));

        // Seed Vault with 50,000 USDC
        usdc.mint(address(vault), 50_000 * 1e6);

        // Configure Session Key for Agent
        vault.configureSessionKey(
            agent,
            uint64(block.timestamp + 30 days),
            1500 * 1e6,
            3000 * 1e6
        );

        vault.setRecipientWhitelist(contractor, true);
        vault.setAllowedTargetSelector(address(escrow), MilestoneEscrow.createEscrow.selector, true);
        vault.setAllowedTargetSelector(address(escrow), MilestoneEscrow.releaseMilestone.selector, true);

        vm.stopPrank();
    }

    function test_CreateEscrow_Success() public {
        vm.prank(agent);
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            ESCROW_AMOUNT,
            TAX_BPS,
            SPEC_HASH
        );

        assertEq(escrowId, 1);
        assertEq(escrow.escrowCount(), 1);

        MilestoneEscrow.EscrowAgreement memory item = escrow.getEscrow(escrowId);
        assertEq(item.id, 1);
        assertEq(item.vault, address(vault));
        assertEq(item.contractor, contractor);
        assertEq(item.totalAmount, ESCROW_AMOUNT);
        assertEq(item.taxWithholdingBps, TAX_BPS);
        assertEq(item.deliverableSpecHash, SPEC_HASH);
        assertEq(item.attestationHash, bytes32(0));
        assertEq(uint256(item.status), uint256(MilestoneEscrow.EscrowStatus.FUNDED));
        assertEq(usdc.balanceOf(address(escrow)), ESCROW_AMOUNT);
    }

    function test_ReleaseMilestone_Success() public {
        vm.startPrank(agent);
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            ESCROW_AMOUNT,
            TAX_BPS,
            SPEC_HASH
        );

        uint256 initialContractorBal = usdc.balanceOf(contractor);
        uint256 initialVaultBal = usdc.balanceOf(address(vault));

        vault.settleEscrowByAgent(address(escrow), escrowId, ATTESTATION_HASH);
        vm.stopPrank();

        // Contractor receives 85% = 1,020 USDC
        assertEq(usdc.balanceOf(contractor), initialContractorBal + 1020 * 1e6);
        // Vault receives 15% = 180 USDC back into tax reserve
        assertEq(usdc.balanceOf(address(vault)), initialVaultBal + 180 * 1e6);
        assertEq(vault.taxReserveBalance(), 180 * 1e6);

        MilestoneEscrow.EscrowAgreement memory item = escrow.getEscrow(escrowId);
        assertEq(uint256(item.status), uint256(MilestoneEscrow.EscrowStatus.SETTLED));
        assertEq(item.attestationHash, ATTESTATION_HASH);
    }

    function test_RevertWhen_ReleaseMilestone_UnauthorizedCaller() public {
        vm.prank(agent);
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            ESCROW_AMOUNT,
            TAX_BPS,
            SPEC_HASH
        );

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                MilestoneEscrow.UnauthorizedCaller.selector,
                unauthorized
            )
        );
        escrow.releaseMilestone(escrowId, ATTESTATION_HASH);
    }

    function test_RevertWhen_ReleaseMilestone_EmptyAttestation() public {
        vm.prank(agent);
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            ESCROW_AMOUNT,
            TAX_BPS,
            SPEC_HASH
        );

        // AegisVault calls releaseMilestone with bytes32(0)
        bytes memory callData = abi.encodeWithSelector(
            MilestoneEscrow.releaseMilestone.selector,
            escrowId,
            bytes32(0)
        );

        vm.prank(owner);
        vm.expectRevert();
        vault.executeByOwner(address(escrow), callData, 0);
    }

    function test_RefundEscrow_Success() public {
        vm.prank(agent);
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            ESCROW_AMOUNT,
            TAX_BPS,
            SPEC_HASH
        );

        uint256 vaultBalBefore = usdc.balanceOf(address(vault));

        // Owner triggers refund on behalf of vault
        bytes memory refundData = abi.encodeWithSelector(
            MilestoneEscrow.refundEscrow.selector,
            escrowId
        );

        vm.prank(owner);
        vault.executeByOwner(address(escrow), refundData, 0);

        assertEq(usdc.balanceOf(address(vault)), vaultBalBefore + ESCROW_AMOUNT);

        MilestoneEscrow.EscrowAgreement memory item = escrow.getEscrow(escrowId);
        assertEq(uint256(item.status), uint256(MilestoneEscrow.EscrowStatus.REFUNDED));
    }
}
