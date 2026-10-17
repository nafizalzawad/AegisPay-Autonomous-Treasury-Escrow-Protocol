// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AegisVault} from "../src/AegisVault.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract DeployAndSeed is Script {
    bytes4 private constant SELECTOR_ERC20_TRANSFER = 0xa9059cbb;
    bytes4 private constant SELECTOR_ERC20_APPROVE = 0x095ea7b3;
    bytes4 private constant SELECTOR_CREATE_ESCROW = 0x0a1d5e6d;
    bytes4 private constant SELECTOR_SETTLE_ESCROW = 0xb20616e0;
    bytes4 private constant SELECTOR_REFUND_ESCROW = 0x47aed508;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "OWNER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address owner = vm.addr(deployerPrivateKey);

        address agent = vm.envOr(
            "AGENT_ADDRESS",
            address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
        );
        address contractor = vm.envOr(
            "CONTRACTOR_ADDRESS",
            address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
        );
        address attacker = vm.envOr(
            "ATTACKER_ADDRESS",
            address(0x90F79bf6EB2c4f870365E785982E1f101E93b906)
        );

        console.log("Deploying AegisPay protocol on chainId:", block.chainid);
        console.log("Owner / Treasury Admin:", owner);
        console.log("AI Agent Key:", agent);
        console.log("Contractor Address:", contractor);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy AegisVault
        AegisVault vault = new AegisVault(owner);
        console.log("AegisVault deployed at:", address(vault));

        // 3. Deploy MilestoneEscrow
        MilestoneEscrow escrow = new MilestoneEscrow();
        console.log("MilestoneEscrow deployed at:", address(escrow));

        // 4. Seed Balances
        usdc.mint(address(vault), 100_000 * 1e6); // 100,000 USDC in Treasury
        usdc.mint(contractor, 5_000 * 1e6);       // 5,000 USDC in Contractor
        console.log("Seeded 100,000 USDC to AegisVault and 5,000 USDC to Contractor");

        // 5. Configure Session Key Policy for AI Agent
        // Max Per-Tx: 1,500 USDC | Max Daily: 3,000 USDC | 30 Days | 15% Tax Reserve
        vault.setSessionPolicy(
            agent,
            1_500 * 1e6,
            3_000 * 1e6,
            30 days,
            1500,
            address(vault)
        );

        // 6. Whitelist Entities
        vault.setRecipientWhitelist(contractor, true);
        vault.setRecipientWhitelist(address(escrow), true);

        vault.setTargetWhitelist(address(usdc), true);
        vault.setTargetWhitelist(address(escrow), true);

        vault.setSelectorWhitelist(SELECTOR_ERC20_TRANSFER, true);
        vault.setSelectorWhitelist(SELECTOR_ERC20_APPROVE, true);
        vault.setSelectorWhitelist(SELECTOR_CREATE_ESCROW, true);
        vault.setSelectorWhitelist(SELECTOR_SETTLE_ESCROW, true);
        vault.setSelectorWhitelist(SELECTOR_REFUND_ESCROW, true);

        vm.stopBroadcast();

        // Write deployment info to JSON
        string memory json = "{\n";
        json = string.concat(json, "  \"chainId\": ", vm.toString(block.chainid), ",\n");
        json = string.concat(json, "  \"network\": \"anvil\",\n");
        json = string.concat(json, "  \"deployedAt\": \"", vm.toString(block.timestamp), "\",\n");
        json = string.concat(json, "  \"contracts\": {\n");
        json = string.concat(json, "    \"MockUSDC\": \"", vm.toString(address(usdc)), "\",\n");
        json = string.concat(json, "    \"AegisVault\": \"", vm.toString(address(vault)), "\",\n");
        json = string.concat(json, "    \"MilestoneEscrow\": \"", vm.toString(address(escrow)), "\"\n");
        json = string.concat(json, "  },\n");
        json = string.concat(json, "  \"accounts\": {\n");
        json = string.concat(json, "    \"owner\": \"", vm.toString(owner), "\",\n");
        json = string.concat(json, "    \"agent\": \"", vm.toString(agent), "\",\n");
        json = string.concat(json, "    \"contractor\": \"", vm.toString(contractor), "\",\n");
        json = string.concat(json, "    \"attacker\": \"", vm.toString(attacker), "\"\n");
        json = string.concat(json, "  }\n");
        json = string.concat(json, "}\n");

        vm.writeFile("../shared/deployments.local.json", json);
        console.log("Deployment manifest saved to shared/deployments.local.json");
    }
}
