// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AegisVault} from "../src/AegisVault.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {IAegisPolicy} from "../src/interfaces/IAegisPolicy.sol";

contract AegisVaultTest is Test {
    MockUSDC public usdc;
    AegisVault public vault;
    MilestoneEscrow public escrow;

    address public owner = address(0x1111);
    address public agent = address(0x2222);
    address public contractor = address(0x3333);
    address public attacker = address(0x6666);

    uint256 public constant MAX_PER_TX = 1500 * 1e6;  // 1,500 USDC
    uint256 public constant MAX_DAILY = 3000 * 1e6;   // 3,000 USDC
    uint16 public constant TAX_BPS = 1500;            // 15%
    uint256 public constant VALIDITY = 7 days;

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

        // Seed Vault with 50,000 USDC
        usdc.mint(address(vault), 50_000 * 1e6);

        // Configure Session Policy for AI Agent
        vault.setSessionPolicy(
            agent,
            MAX_PER_TX,
            MAX_DAILY,
            VALIDITY,
            TAX_BPS,
            address(vault)
        );

        // Whitelist Recipient
        vault.setRecipientWhitelist(contractor, true);

        // Whitelist Targets
        vault.setTargetWhitelist(address(usdc), true);
        vault.setTargetWhitelist(address(escrow), true);

        // Whitelist Selectors
        vault.setSelectorWhitelist(SELECTOR_ERC20_TRANSFER, true);
        vault.setSelectorWhitelist(SELECTOR_ERC20_APPROVE, true);
        vault.setSelectorWhitelist(SELECTOR_CREATE_ESCROW, true);
        vault.setSelectorWhitelist(SELECTOR_SETTLE_ESCROW, true);
        vault.setSelectorWhitelist(SELECTOR_REFUND_ESCROW, true);

        vm.stopPrank();
    }

    // =========================================================================
    // 1. OWNER PERMISSIONS
    // =========================================================================

    function test_OwnerExecution_Success() public {
        vm.startPrank(owner);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            5_000 * 1e6
        );
        vault.executeAsOwner(address(usdc), 0, data);
        vm.stopPrank();

        assertEq(usdc.balanceOf(contractor), 5_000 * 1e6);
        assertEq(usdc.balanceOf(address(vault)), 45_000 * 1e6);
    }

    // =========================================================================
    // 2. VALID AGENT EXECUTION WITHIN POLICY
    // =========================================================================

    function test_AgentExecution_ValidTransfer_Success() public {
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            1_000 * 1e6
        );
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();

        assertEq(usdc.balanceOf(contractor), 1_000 * 1e6);
        assertEq(vault.getAvailableDailyLimit(), 2_000 * 1e6);
    }

    // =========================================================================
    // 3. SPEND LIMIT DEFENSE (RED-TEAM SCENARIO 1: $10,000 DRAIN)
    // =========================================================================

    function test_AgentExecution_SpendLimitExceeded_Reverts() public {
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            10_000 * 1e6 // 10,000 USDC attack
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.SpendLimitExceeded.selector,
                10_000 * 1e6,
                MAX_PER_TX
            )
        );
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();

        // Zero loss verification
        assertEq(usdc.balanceOf(contractor), 0);
        assertEq(usdc.balanceOf(address(vault)), 50_000 * 1e6);
    }

    function test_AgentExecution_DailyLimitExceeded_Reverts() public {
        vm.startPrank(agent);
        // Spend 1,500 USDC
        bytes memory data1 = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            1_500 * 1e6
        );
        vault.executeAsAgent(address(usdc), 0, data1);

        // Spend another 1,500 USDC (total daily = 3,000 USDC)
        vault.executeAsAgent(address(usdc), 0, data1);

        assertEq(vault.getAvailableDailyLimit(), 0);

        // Attempting to spend even 1 USDC more today must revert
        bytes memory dataExcess = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            1 * 1e6
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.DailyLimitExceeded.selector,
                1 * 1e6,
                0
            )
        );
        vault.executeAsAgent(address(usdc), 0, dataExcess);
        vm.stopPrank();
    }

    function test_AgentExecution_DailyReset_Success() public {
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            1_500 * 1e6
        );
        vault.executeAsAgent(address(usdc), 0, data);
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();

        assertEq(vault.getAvailableDailyLimit(), 0);

        // Fast forward 1 day + 1 second
        vm.warp(block.timestamp + 1 days + 1);

        assertEq(vault.getAvailableDailyLimit(), MAX_DAILY);

        // Agent can now spend again
        vm.prank(agent);
        vault.executeAsAgent(address(usdc), 0, data);
        assertEq(usdc.balanceOf(contractor), 4_500 * 1e6);
    }

    // =========================================================================
    // 4. WHITELIST DEFENSE (RED-TEAM SCENARIO 2: UNWHITELISTED HACKER)
    // =========================================================================

    function test_AgentExecution_UnwhitelistedRecipient_Reverts() public {
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            attacker,
            500 * 1e6
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.RecipientNotWhitelisted.selector,
                attacker
            )
        );
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();

        // Balance of attacker remains 0
        assertEq(usdc.balanceOf(attacker), 0);
    }

    function test_AgentExecution_UnwhitelistedTarget_Reverts() public {
        address rogueContract = address(0x9999);
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(SELECTOR_ERC20_TRANSFER, contractor, 100 * 1e6);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.TargetNotWhitelisted.selector,
                rogueContract
            )
        );
        vault.executeAsAgent(rogueContract, 0, data);
        vm.stopPrank();
    }

    function test_AgentExecution_UnwhitelistedSelector_Reverts() public {
        bytes4 maliciousSelector = bytes4(keccak256("drainEverything()"));
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(maliciousSelector);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.SelectorNotAllowed.selector,
                maliciousSelector
            )
        );
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();
    }

    // =========================================================================
    // 5. APPROVAL DEFENSE (RED-TEAM SCENARIO 3: INFINITE APPROVAL)
    // =========================================================================

    function test_AgentExecution_InfiniteApproval_Reverts() public {
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_APPROVE,
            address(escrow),
            type(uint256).max
        );

        vm.expectRevert(IAegisPolicy.InfiniteApprovalForbidden.selector);
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();

        // Allowance remains 0
        assertEq(usdc.allowance(address(vault), address(escrow)), 0);
    }

    // =========================================================================
    // 6. ACCESS CONTROL & EXPIRATION
    // =========================================================================

    function test_AgentExecution_UnauthorizedCaller_Reverts() public {
        vm.startPrank(attacker);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            500 * 1e6
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                IAegisPolicy.UnauthorizedAgent.selector,
                attacker
            )
        );
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();
    }

    function test_AgentExecution_PolicyExpired_Reverts() public {
        // Warp past 7 days validity
        vm.warp(block.timestamp + VALIDITY + 1);

        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            500 * 1e6
        );

        vm.expectRevert();
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();
    }

    // =========================================================================
    // 7. FUZZ TESTING
    // =========================================================================

    function testFuzz_SpendLimit(uint256 amount) public {
        vm.assume(amount > MAX_PER_TX && amount < 100_000_000 * 1e6);
        vm.startPrank(agent);
        bytes memory data = abi.encodeWithSelector(
            SELECTOR_ERC20_TRANSFER,
            contractor,
            amount
        );

        vm.expectRevert();
        vault.executeAsAgent(address(usdc), 0, data);
        vm.stopPrank();
    }
}
