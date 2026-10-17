// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AegisVault} from "../src/AegisVault.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {IAegisPolicy} from "../src/interfaces/IAegisPolicy.sol";

contract AegisVaultTest is Test {
    MockUSDC public usdc;
    AegisVault public vault;
    MilestoneEscrow public escrow;

    uint256 internal ownerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address public owner = vm.addr(ownerPrivateKey);

    uint256 internal agentPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address public agent = vm.addr(agentPrivateKey);

    address public contractor = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    uint256 internal hackerPrivateKey = 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6;
    address public hacker = vm.addr(hackerPrivateKey);

    address public entryPoint = address(0x0000000071727De22E5E9d8BAf0edAc6f37da032);

    uint256 public constant MAX_PER_TX = 1500 * 1e6;  // 1,500 USDC
    uint256 public constant MAX_DAILY = 3000 * 1e6;   // 3,000 USDC
    uint64 public constant EXPIRES_IN = 30 days;

    bytes4 private constant SELECTOR_ERC20_TRANSFER = 0xa9059cbb;
    bytes4 private constant SELECTOR_ERC20_APPROVE  = 0x095ea7b3;

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockUSDC();
        vault = new AegisVault(owner, entryPoint, address(usdc));
        escrow = new MilestoneEscrow(address(usdc));

        // Seed Vault with 25,000 USDC
        usdc.mint(address(vault), 25_000 * 1e6);

        // Configure Session Key Policy for Agent
        vault.configureSessionKey(
            agent,
            uint64(block.timestamp + EXPIRES_IN),
            MAX_PER_TX,
            MAX_DAILY
        );

        // Whitelist Contractor
        vault.setRecipientWhitelist(contractor, true);

        // Whitelist Target Selectors:
        // MockUSDC.transfer allowed
        vault.setAllowedTargetSelector(address(usdc), SELECTOR_ERC20_TRANSFER, true);
        // MilestoneEscrow.createEscrow and releaseMilestone allowed
        vault.setAllowedTargetSelector(address(escrow), MilestoneEscrow.createEscrow.selector, true);
        vault.setAllowedTargetSelector(address(escrow), MilestoneEscrow.releaseMilestone.selector, true);

        // Intentionally DO NOT whitelist SELECTOR_ERC20_APPROVE on mockUsdc for raw agent calls!

        vm.stopPrank();
    }

    // =========================================================================
    // TEST 1: Initial Vault Setup And Balances
    // =========================================================================
    function test_InitialVaultSetupAndBalances() public view {
        assertEq(usdc.balanceOf(address(vault)), 25_000 * 1e6);
        assertEq(vault.taxReserveBalance(), 0);
        assertEq(vault.operatingBalance(), 25_000 * 1e6);
        assertEq(vault.owner(), owner);

        (
            bool isActive,
            uint64 expiresAt,
            uint256 maxPerTx,
            uint256 maxDaily,
            uint256 spentToday,
            uint64 lastResetTimestamp
        ) = vault.sessionPolicies(agent);

        assertTrue(isActive);
        assertEq(expiresAt, uint64(block.timestamp + EXPIRES_IN));
        assertEq(maxPerTx, MAX_PER_TX);
        assertEq(maxDaily, MAX_DAILY);
        assertEq(spentToday, 0);
        assertEq(lastResetTimestamp, uint64(block.timestamp));
    }

    // =========================================================================
    // TEST 2: Agent Direct Transfer Within Policy Succeeds
    // =========================================================================
    function test_AgentDirectTransfer_WithinPolicy_Succeeds() public {
        uint256 transferAmount = 500 * 1e6;
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            transferAmount
        );

        vm.prank(agent);
        vault.executeByAgent(
            address(usdc),
            data,
            contractor,
            transferAmount,
            keccak256("TX_01")
        );

        assertEq(usdc.balanceOf(contractor), transferAmount);
        assertEq(usdc.balanceOf(address(vault)), (25_000 - 500) * 1e6);

        (, , , , uint256 spentToday, ) = vault.sessionPolicies(agent);
        assertEq(spentToday, transferAmount);
    }

    // =========================================================================
    // TEST 3: Revert When Agent Exceeds Per-Tx Cap
    // =========================================================================
    function test_RevertWhen_AgentExceedsPerTxCap() public {
        uint256 excessiveAmount = 1501 * 1e6; // Cap is 1500 USDC
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            excessiveAmount
        );

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.PerTxSpendLimitExceeded.selector,
                excessiveAmount,
                MAX_PER_TX
            )
        );
        vault.executeByAgent(
            address(usdc),
            data,
            contractor,
            excessiveAmount,
            keccak256("EXCESS_TX")
        );

        // Zero loss
        assertEq(usdc.balanceOf(contractor), 0);
        assertEq(usdc.balanceOf(address(vault)), 25_000 * 1e6);
    }

    // =========================================================================
    // TEST 4: Revert When Agent Exceeds Daily Cap
    // =========================================================================
    function test_RevertWhen_AgentExceedsDailyCap() public {
        bytes memory data1 = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 1200 * 1e6);
        bytes memory data2 = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 1200 * 1e6);
        bytes memory data3 = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 700 * 1e6);

        vm.startPrank(agent);
        // Spend 1: 1200 USDC
        vault.executeByAgent(address(usdc), data1, contractor, 1200 * 1e6, keccak256("SPEND_1"));
        // Spend 2: 1200 USDC (Total: 2400 USDC)
        vault.executeByAgent(address(usdc), data2, contractor, 1200 * 1e6, keccak256("SPEND_2"));

        // Spend 3: 700 USDC (2400 + 700 = 3100 > 3000 daily cap) -> Must Revert!
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.DailySpendLimitExceeded.selector,
                700 * 1e6,
                600 * 1e6 // 3000 - 2400 = 600 remaining
            )
        );
        vault.executeByAgent(address(usdc), data3, contractor, 700 * 1e6, keccak256("SPEND_3"));
        vm.stopPrank();

        assertEq(usdc.balanceOf(contractor), 2400 * 1e6);
    }

    // =========================================================================
    // TEST 5: Rolling 24-Hour Window Resets Daily Spend
    // =========================================================================
    function test_Rolling24HourWindowResetsDailySpend() public {
        bytes memory data = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 1500 * 1e6);

        vm.startPrank(agent);
        // Max out 3,000 USDC today in 2 transactions of 1,500 USDC
        vault.executeByAgent(address(usdc), data, contractor, 1500 * 1e6, keccak256("TX_A"));
        vault.executeByAgent(address(usdc), data, contractor, 1500 * 1e6, keccak256("TX_B"));

        // Warp 24 hours + 1 second
        vm.warp(block.timestamp + 1 days + 1);

        // Daily spend should reset, allowing new 1,500 USDC spend
        vault.executeByAgent(address(usdc), data, contractor, 1500 * 1e6, keccak256("TX_C"));
        vm.stopPrank();

        assertEq(usdc.balanceOf(contractor), 4500 * 1e6);
        (, , , , uint256 spentToday, ) = vault.sessionPolicies(agent);
        assertEq(spentToday, 1500 * 1e6);
    }

    // =========================================================================
    // TEST 6: Revert When Recipient Not Whitelisted
    // =========================================================================
    function test_RevertWhen_RecipientNotWhitelisted() public {
        bytes memory data = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, hacker, 100 * 1e6);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.RecipientNotWhitelisted.selector,
                hacker
            )
        );
        vault.executeByAgent(
            address(usdc),
            data,
            hacker,
            100 * 1e6,
            keccak256("HACK_TRANSFER")
        );

        assertEq(usdc.balanceOf(hacker), 0);
    }

    // =========================================================================
    // TEST 7: Revert When Calldata Recipient Mismatch (Argument Spoofing Defense)
    // =========================================================================
    function test_RevertWhen_CalldataRecipientMismatch() public {
        // Agent passes whitelisted 'contractor' as outer argument, but encodes 'hacker' inside calldata!
        bytes memory maliciousData = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            hacker,
            100 * 1e6
        );

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.RecipientNotWhitelisted.selector,
                hacker
            )
        );
        vault.executeByAgent(
            address(usdc),
            maliciousData,
            contractor, // spoofed benign outer argument
            100 * 1e6,
            keccak256("SPOOF_ATTACK")
        );

        assertEq(usdc.balanceOf(hacker), 0);
    }

    // =========================================================================
    // TEST 8: Revert When Malicious Approve Selector Called (Red-Team Attack 3)
    // =========================================================================
    function test_RevertWhen_MaliciousApproveSelectorCalled() public {
        bytes memory maliciousApproveData = abi.encodeWithSelector(
            SELECTOR_ERC20_APPROVE,
            hacker,
            type(uint256).max
        );

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.FunctionSelectorNotAllowed.selector,
                SELECTOR_ERC20_APPROVE
            )
        );
        vault.executeByAgent(
            address(usdc),
            maliciousApproveData,
            hacker,
            0,
            keccak256("MALICIOUS_APPROVE")
        );

        assertEq(usdc.allowance(address(vault), hacker), 0);
    }

    // =========================================================================
    // TEST 9: Revert When Session Key Expired
    // =========================================================================
    function test_RevertWhen_SessionKeyExpired() public {
        // Warp past 30 days
        vm.warp(block.timestamp + EXPIRES_IN + 1);

        bytes memory data = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 500 * 1e6);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.SessionKeyExpired.selector,
                uint64(block.timestamp - 1),
                uint64(block.timestamp)
            )
        );
        vault.executeByAgent(address(usdc), data, contractor, 500 * 1e6, keccak256("EXPIRED_CALL"));
    }

    // =========================================================================
    // TEST 10: Revert When Session Key Revoked
    // =========================================================================
    function test_RevertWhen_SessionKeyRevoked() public {
        vm.prank(owner);
        vault.revokeSessionKey(agent);

        bytes memory data = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 500 * 1e6);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.SessionKeyInactive.selector,
                agent
            )
        );
        vault.executeByAgent(address(usdc), data, contractor, 500 * 1e6, keccak256("REVOKED_CALL"));
    }

    // =========================================================================
    // TEST 11: Create And Settle Milestone Escrow With Tax Split
    // =========================================================================
    function test_CreateAndSettleMilestoneEscrow_WithTaxSplit() public {
        bytes32 specHash = keccak256("Deliver Verified CI/CD Suite");
        bytes32 attestation = keccak256("GITHUB_CI_SUCCESS_RUN_94827");

        uint256 escrowAmount = 1200 * 1e6;
        uint16 taxBps = 1500; // 15%

        vm.startPrank(agent);

        // 1. Agent atomically approves and creates escrow via AegisVault
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            escrowAmount,
            taxBps,
            specHash
        );

        assertEq(escrowId, 1);
        assertEq(usdc.balanceOf(address(escrow)), escrowAmount);
        assertEq(usdc.balanceOf(address(vault)), (25_000 - 1200) * 1e6);

        // 2. Settlement upon verified perception attestation
        vault.settleEscrowByAgent(address(escrow), escrowId, attestation);

        vm.stopPrank();

        // Contractor payout: 1200 * 85% = 1020 USDC
        assertEq(usdc.balanceOf(contractor), 1020 * 1e6);

        // Tax reserve withheld: 1200 * 15% = 180 USDC
        assertEq(vault.taxReserveBalance(), 180 * 1e6);

        // Vault total balance = 25,000 - 1200 + 180 = 23,980 USDC
        assertEq(usdc.balanceOf(address(vault)), 23_980 * 1e6);

        // Operating balance = 23,980 - 180 = 23,800 USDC
        assertEq(vault.operatingBalance(), 23_800 * 1e6);
    }

    // =========================================================================
    // TEST 12: Agent Cannot Spend Tax Reserve Balance
    // =========================================================================
    function test_AgentCannotSpendTaxReserveBalance() public {
        // Step 1: Fund tax reserve with 5,000 USDC
        vm.prank(owner);
        vault.recordTaxWithholding(999, 5_000 * 1e6);

        assertEq(vault.taxReserveBalance(), 5_000 * 1e6);
        assertEq(vault.operatingBalance(), (25_000 - 5_000) * 1e6);

        // Step 2: Temporarily drain operating balance down to 500 USDC
        bytes memory drainOpData = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            19_500 * 1e6
        );
        vm.prank(owner);
        vault.executeByOwner(address(usdc), drainOpData, 0);

        // Now: Total Vault balance = 5,500 USDC.
        // Tax reserve = 5,000 USDC.
        // Operating balance = 500 USDC.
        assertEq(usdc.balanceOf(address(vault)), 5_500 * 1e6);
        assertEq(vault.operatingBalance(), 500 * 1e6);

        // Agent attempts to transfer 600 USDC (which is below maxPerTx of 1500 USDC, but exceeds operatingBalance of 500 USDC!)
        bytes memory agentData = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 600 * 1e6);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.PerTxSpendLimitExceeded.selector,
                600 * 1e6,
                500 * 1e6 // Available operating balance
            )
        );
        vault.executeByAgent(address(usdc), agentData, contractor, 600 * 1e6, keccak256("DIP_TAX_RESERVE"));

        // Tax reserve remains completely intact
        assertEq(vault.taxReserveBalance(), 5_000 * 1e6);
    }

    // =========================================================================
    // TEST 13: Validate UserOp ERC-4337 Signature Verification
    // =========================================================================
    function test_ValidateUserOp_ERC4337SignatureVerification() public {
        bytes32 userOpHash = keccak256(abi.encode("testUserOpHash", block.timestamp));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );

        // Sub-test A: Valid Signature from AI Agent Session Key
        {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentPrivateKey, ethSignedHash);
            IAegisPolicy.PackedUserOperation memory userOpAgent;
            userOpAgent.sender = address(vault);
            userOpAgent.signature = abi.encodePacked(r, s, v);

            uint256 valDataAgent = vault.validateUserOp(userOpAgent, userOpHash, 0);
            assertEq(valDataAgent, 0, "Valid session key signature must return 0");
        }

        // Sub-test B: Valid Signature from Owner
        {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, ethSignedHash);
            IAegisPolicy.PackedUserOperation memory userOpOwner;
            userOpOwner.sender = address(vault);
            userOpOwner.signature = abi.encodePacked(r, s, v);

            uint256 valDataOwner = vault.validateUserOp(userOpOwner, userOpHash, 0);
            assertEq(valDataOwner, 0, "Valid owner signature must return 0");
        }

        // Sub-test C: Invalid Signature from Unwhitelisted Hacker
        {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(hackerPrivateKey, ethSignedHash);
            IAegisPolicy.PackedUserOperation memory userOpHacker;
            userOpHacker.sender = address(vault);
            userOpHacker.signature = abi.encodePacked(r, s, v);

            uint256 valDataHacker = vault.validateUserOp(userOpHacker, userOpHash, 0);
            assertEq(valDataHacker, 1, "Invalid signature from hacker must return 1");
        }
    }

    // =========================================================================
    // TEST 14: Fuzz Test - Session Key Never Exceeds Caps
    // =========================================================================
    function testFuzz_SessionKeyNeverExceedsCaps(uint256 amount) public {
        vm.assume(amount > MAX_PER_TX && amount < 100_000_000 * 1e6);

        bytes memory data = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, amount);

        vm.prank(agent);
        vm.expectRevert();
        vault.executeByAgent(address(usdc), data, contractor, amount, keccak256("FUZZ_TEST"));
    }
}
