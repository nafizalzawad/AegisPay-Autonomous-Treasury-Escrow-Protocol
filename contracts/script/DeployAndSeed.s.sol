// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AegisVault} from "../src/AegisVault.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract DeployAndSeed is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "OWNER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address owner = vm.addr(deployerPrivateKey);

        address agentSessionKey = vm.envOr(
            "AGENT_SESSION_KEY",
            address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
        );
        address contractor = vm.envOr(
            "CONTRACTOR_ADDRESS",
            address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
        );
        address hacker = vm.envOr(
            "HACKER_ADDRESS",
            address(0xa0Ee7A142d267C1f36714E4a8F75612F20a79720)
        );

        address entryPoint = address(0x0000000071727De22E5E9d8BAf0edAc6f37da032);

        console.log("=== Deploying AegisPay Protocol (Phase 1) ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer / Vault Owner:", owner);
        console.log("AI Agent Session Key:", agentSessionKey);
        console.log("Contractor Address (DevStudio):", contractor);
        console.log("Hacker Address (Rogue / Unwhitelisted):", hacker);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC mockUsdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUsdc));

        // 2. Deploy AegisVault
        AegisVault vault = new AegisVault(owner, entryPoint, address(mockUsdc));
        console.log("AegisVault deployed at:", address(vault));

        // 3. Deploy MilestoneEscrow
        MilestoneEscrow escrow = new MilestoneEscrow(address(mockUsdc));
        console.log("MilestoneEscrow deployed at:", address(escrow));

        // 4. Mint 24,880 USDC to AegisVault so after Escrow #1 (800 USDC funded, 120 USDC tax withheld)
        // total balance is 24,200 USDC (24,080 operating + 120 tax reserve)
        mockUsdc.mint(address(vault), 24_880 * 1e6);
        console.log("Minted 24,880 USDC to AegisVault");

        // 5. Configure SessionKeyPolicy for AI Agent Account #1
        vault.configureSessionKey(
            agentSessionKey,
            uint64(block.timestamp + 30 days),
            1500 * 1e6, // maxAmountPerTx: 1,500 USDC
            3000 * 1e6  // maxAmountPerDay: 3,000 USDC
        );
        console.log("Configured SessionKeyPolicy for Agent");

        // 6. Whitelist Contractor on AegisVault
        vault.setRecipientWhitelist(contractor, true);
        console.log("Whitelisted Contractor DevStudio on AegisVault");

        // 7. Whitelist allowed target selectors on AegisVault
        // Whitelist transfer on MockUSDC
        vault.setAllowedTargetSelector(address(mockUsdc), MockUSDC.transfer.selector, true);
        // Intentionally DO NOT whitelist MockUSDC.approve so raw agent calls to approve revert!
        
        // Whitelist createEscrow and releaseMilestone on MilestoneEscrow
        vault.setAllowedTargetSelector(
            address(escrow),
            MilestoneEscrow.createEscrow.selector,
            true
        );
        vault.setAllowedTargetSelector(
            address(escrow),
            MilestoneEscrow.releaseMilestone.selector,
            true
        );

        vm.stopBroadcast();

        // 8. Seed 1 completed historical escrow #1 of 800 USDC
        // Prank as agent to create and settle escrow #1
        uint256 agentPrivateKey = vm.envOr(
            "AGENT_SESSION_PRIVATE_KEY",
            uint256(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d)
        );
        vm.startBroadcast(agentPrivateKey);
        uint256 escrowId = vault.createEscrowByAgent(
            address(escrow),
            contractor,
            800 * 1e6,
            1500, // 15% tax
            keccak256("Deliver Initial Architecture Specs")
        );
        vault.settleEscrowByAgent(
            address(escrow),
            escrowId,
            keccak256("GITHUB_CI_RUN_INITIAL_SPECS_VERIFIED")
        );
        vm.stopBroadcast();

        // Reset spentToday back to 0 so fresh budget of 3,000 USDC is available for live demo
        vm.startBroadcast(deployerPrivateKey);
        vault.configureSessionKey(
            agentSessionKey,
            uint64(block.timestamp + 30 days),
            1500 * 1e6,
            3000 * 1e6
        );
        vm.stopBroadcast();

        console.log("Seeded Historical Escrow #1 (800 USDC). Tax Reserve Balance:", vault.taxReserveBalance());
        console.log("AegisVault Total Balance:", mockUsdc.balanceOf(address(vault)));
        console.log("AegisVault Operating Balance:", vault.operatingBalance());

        // 9. Export deployment manifest
        string memory json = "{\n";
        json = string.concat(json, "  \"chainId\": ", vm.toString(block.chainid), ",\n");
        json = string.concat(json, "  \"network\": \"anvil\",\n");
        json = string.concat(json, "  \"deployedAt\": ", vm.toString(block.timestamp), ",\n");
        json = string.concat(json, "  \"contracts\": {\n");
        json = string.concat(json, "    \"mockUsdc\": \"", vm.toString(address(mockUsdc)), "\",\n");
        json = string.concat(json, "    \"aegisVault\": \"", vm.toString(address(vault)), "\",\n");
        json = string.concat(json, "    \"milestoneEscrow\": \"", vm.toString(address(escrow)), "\",\n");
        json = string.concat(json, "    \"MockUSDC\": \"", vm.toString(address(mockUsdc)), "\",\n");
        json = string.concat(json, "    \"AegisVault\": \"", vm.toString(address(vault)), "\",\n");
        json = string.concat(json, "    \"MilestoneEscrow\": \"", vm.toString(address(escrow)), "\"\n");
        json = string.concat(json, "  },\n");
        json = string.concat(json, "  \"accounts\": {\n");
        json = string.concat(json, "    \"owner\": \"", vm.toString(owner), "\",\n");
        json = string.concat(json, "    \"agentSessionKey\": \"", vm.toString(agentSessionKey), "\",\n");
        json = string.concat(json, "    \"agent\": \"", vm.toString(agentSessionKey), "\",\n");
        json = string.concat(json, "    \"contractor\": \"", vm.toString(contractor), "\",\n");
        json = string.concat(json, "    \"hacker\": \"", vm.toString(hacker), "\",\n");
        json = string.concat(json, "    \"attacker\": \"", vm.toString(hacker), "\"\n");
        json = string.concat(json, "  }\n");
        json = string.concat(json, "}\n");

        vm.writeFile("../shared/deployments.local.json", json);
        console.log("Deployment manifest written to shared/deployments.local.json");
    }
}
