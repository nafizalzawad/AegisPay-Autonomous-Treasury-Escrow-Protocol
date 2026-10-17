#!/usr/bin/env python3
"""
scripts/e2e_verify.py — AegisPay Full-Stack E2E Smoke & Adversarial Verification Suite
Validates all 10 demo-critical checkpoints against the live FastAPI relayer & Anvil node.
"""

import sys
import time
import httpx
from typing import Dict, Any

BASE_URL = "http://127.0.0.1:8000/api/v1"

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    YELLOW = "\033[93m"
    BOLD = "\033[1m"
    END = "\033[0m"

def print_header(title: str) -> None:
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 75}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}  {title}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 75}{Colors.END}\n")

def print_step(num: int, title: str) -> None:
    print(f"{Colors.BOLD}{Colors.BLUE}[Checkpoint {num:02d}]{Colors.END} {title}...", end=" ", flush=True)

def print_pass(detail: str = "") -> None:
    msg = f"{Colors.GREEN}[PASS]{Colors.END}"
    if detail:
        msg += f" {Colors.YELLOW}({detail}){Colors.END}"
    print(msg)

def print_fail(reason: str) -> None:
    print(f"{Colors.RED}[FAIL]{Colors.END} -> {reason}")
    sys.exit(1)

def run_e2e_verification() -> None:
    start_time = time.time()
    print_header("AEGISPAY: AUTOMATED FULL-STACK E2E VERIFICATION SUITE")

    with httpx.Client(base_url=BASE_URL, timeout=20.0) as client:
        # Checkpoint 0: Health Check
        print_step(0, "Backend Relayer & Anvil Health Check")
        try:
            r = client.get("/health")
            if r.status_code != 200 or not r.json().get("chain_connected"):
                print_fail(f"Health check failed: {r.text}")
            print_pass(f"Chain ID: {r.json().get('chain_id')}")
        except Exception as e:
            print_fail(f"Could not connect to {BASE_URL}: {e}")

        # Checkpoint 1: Reset & Seed
        print_step(1, "Reset Sandbox to Clean Initial Seed State")
        r = client.post("/vault/reset-demo")
        if r.status_code != 200 or not r.json().get("ok"):
            print_fail(f"Reset demo failed: {r.text}")
        print_pass("Anvil State Seeded")

        # Checkpoint 2: Initial Telemetry Verification
        print_step(2, "Initial Treasury & Policy Telemetry")
        r = client.get("/vault/state")
        if r.status_code != 200:
            print_fail(f"Could not get vault state: {r.text}")
        state = r.json()
        assert state["total_balance_usdc"] == 24200.0, f"Expected 24200.0, got {state['total_balance_usdc']}"
        assert state["operating_balance_usdc"] == 24080.0, f"Expected 24080.0, got {state['operating_balance_usdc']}"
        assert state["tax_reserve_balance_usdc"] == 120.0, f"Expected 120.0, got {state['tax_reserve_balance_usdc']}"
        policy = state["policy"]
        assert policy["max_per_tx_usdc"] == 1500.0, f"Expected max_per_tx 1500.0, got {policy['max_per_tx_usdc']}"
        assert policy["spent_today_usdc"] == 0.0, f"Expected spent_today 0.0, got {policy['spent_today_usdc']}"
        print_pass(f"Vault: ${state['total_balance_usdc']:,.2f} | Operating: ${state['operating_balance_usdc']:,.2f} | Tax: ${state['tax_reserve_balance_usdc']:,.2f}")

        # Checkpoint 3: Stage 1 & 2 Pre-Execution Dry-Run Simulation
        print_step(3, "Stage 1 & 2 Dry-Run Simulation (1,200 USDC Escrow)")
        sim_prompt = "Lock 1,200 USDC in milestone escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve."
        r = client.post("/intent/parse-and-simulate", json={"prompt": sim_prompt, "execute_immediately": False})
        if r.status_code != 200 or not r.json().get("ok"):
            print_fail(f"Parse and simulate failed: {r.text}")
        sim_data = r.json()
        firewall = sim_data["firewall"]
        assert firewall["overall_approved"] is True, "Firewall rejected valid intent"
        assert firewall["stage1_offchain_passed"] is True, "Stage 1 off-chain checks failed"
        assert firewall["stage2_onchain_simulation_passed"] is True, "Stage 2 EVM eth_call simulation failed"
        assert abs(abs(firewall["balance_delta_usdc"]) - 1200.0) < 0.01, f"Expected delta 1200.0, got {firewall['balance_delta_usdc']}"
        print_pass(f"5/5 Guardrails Passed | EVM Dry-Run: {firewall['evm_simulation_status']}")

        # Checkpoint 4: On-Chain Escrow Execution via Session Key
        print_step(4, "On-Chain Escrow Creation via Session Key")
        r = client.post("/intent/parse-and-simulate", json={"prompt": sim_prompt, "execute_immediately": True})
        if r.status_code != 200 or not r.json().get("ok"):
            print_fail(f"Execution failed: {r.text}")
        exec_data = r.json()
        assert exec_data["executed"] is True, "Expected executed == True"
        assert exec_data["tx_hash"] and exec_data["tx_hash"].startswith("0x"), "Invalid tx_hash"
        escrow = exec_data["escrow"]
        assert escrow["status"] == "FUNDED", f"Expected FUNDED, got {escrow['status']}"
        created_escrow_id = escrow["escrow_id"]
        print_pass(f"Escrow #{created_escrow_id} Funded | Tx: {exec_data['tx_hash'][:10]}...")

        # Checkpoint 5: Rolling 24h Spend Cap Synchronization
        print_step(5, "On-Chain Rolling 24h Budget Tracking")
        r = client.get("/vault/state")
        state = r.json()
        policy = state["policy"]
        assert policy["spent_today_usdc"] == 1200.0, f"Expected spent_today 1200.0, got {policy['spent_today_usdc']}"
        assert policy["remaining_daily_usdc"] == 1800.0, f"Expected remaining 1800.0, got {policy['remaining_daily_usdc']}"
        print_pass(f"Spent Today: ${policy['spent_today_usdc']:,.2f} | Remaining Daily: ${policy['remaining_daily_usdc']:,.2f}")

        # Checkpoint 6: Failed CI Webhook Protection (Autonomous Rejection)
        print_step(6, "Perception: Failing CI Webhook Blocks Release")
        r = client.post("/escrows/verify-webhook", json={
            "escrow_id": created_escrow_id,
            "provider": "github_actions",
            "repo_or_tracking_id": "AegisPay/smart-treasury-suite",
            "commit_sha_or_waybill": "bad_commit_001",
            "tests_passed": False,
            "passed_count": 38,
            "failed_count": 4,
        })
        if r.status_code != 200:
            print_fail(f"Webhook verification request failed: {r.text}")
        hook_res = r.json()
        assert hook_res.get("settled") is False, "Failing CI tests should never settle escrow"
        assert hook_res.get("reason") == "CI_TESTS_FAILED", f"Unexpected reason: {hook_res.get('reason')}"

        # Verify escrow is still FUNDED
        r_escrows = client.get("/escrows")
        escrows_list = r_escrows.json()
        target_escrow = next((e for e in escrows_list if e["escrow_id"] == created_escrow_id), None)
        assert target_escrow is not None and target_escrow["status"] == "FUNDED", "Escrow state corrupted after failing hook"
        print_pass("Release Rejected | Funds Protected in Escrow")

        # Checkpoint 7: Passing CI Webhook Settlement & 85/15 Tax Split
        print_step(7, "Passing CI Webhook: Autonomous Settlement & Tax Split")
        r = client.post("/escrows/verify-webhook", json={
            "escrow_id": created_escrow_id,
            "provider": "github_actions",
            "repo_or_tracking_id": "AegisPay/smart-treasury-suite",
            "commit_sha_or_waybill": "good_commit_4a9f",
            "tests_passed": True,
            "passed_count": 42,
            "failed_count": 0,
        })
        if r.status_code != 200 or not r.json().get("settled"):
            print_fail(f"Passing webhook settlement failed: {r.text}")
        settle_res = r.json()
        assert settle_res["contractor_payout_usdc"] == 1020.0, f"Expected 1020.0 payout, got {settle_res['contractor_payout_usdc']}"
        assert settle_res["tax_withheld_usdc"] == 180.0, f"Expected 180.0 tax, got {settle_res['tax_withheld_usdc']}"

        # Verify on-chain vault tax reserve updated to 300.0 (120 initial + 180 withheld)
        r_state = client.get("/vault/state")
        state_after = r_state.json()
        assert state_after["tax_reserve_balance_usdc"] == 300.0, f"Expected tax reserve 300.0, got {state_after['tax_reserve_balance_usdc']}"
        print_pass(f"DevStudio Net: +${settle_res['contractor_payout_usdc']:,.2f} | Tax Reserve: +${settle_res['tax_withheld_usdc']:,.2f} (Total: ${state_after['tax_reserve_balance_usdc']:,.2f})")

        # Checkpoint 8: Red-Team Attack #1 — Prompt Injection $10k Drain
        print_step(8, "Red-Team #1: Prompt Injection ($10,000 Over-Limit Drain)")
        r = client.post("/security/redteam-attack", json={
            "scenario_id": "PROMPT_INJECTION_OVER_LIMIT",
            "force_onchain_execution": True,
        })
        if r.status_code != 200:
            print_fail(f"Attack scenario #1 failed: {r.text}")
        atk1 = r.json()
        assert atk1["onchain_reverted_as_expected"] is True, "Attack should have reverted on-chain"
        assert atk1["solidity_custom_error"] == "PerTxSpendLimitExceeded", f"Expected PerTxSpendLimitExceeded, got {atk1['solidity_custom_error']}"
        assert atk1["funds_lost_usdc"] == 0.0, f"Funds lost must be 0.0, got {atk1['funds_lost_usdc']}"
        print_pass(f"Reverted on-chain: {atk1['solidity_custom_error']} | Loss: $0.00")

        # Checkpoint 9: Red-Team Attack #2 — Phishing Unwhitelisted Recipient
        print_step(9, "Red-Team #2: Phishing Attack (Unwhitelisted Hacker Wallet)")
        r = client.post("/security/redteam-attack", json={
            "scenario_id": "UNWHITELISTED_PHISHING_RECIPIENT",
            "force_onchain_execution": True,
        })
        if r.status_code != 200:
            print_fail(f"Attack scenario #2 failed: {r.text}")
        atk2 = r.json()
        assert atk2["onchain_reverted_as_expected"] is True, "Attack should have reverted on-chain"
        assert atk2["solidity_custom_error"] == "RecipientNotWhitelisted", f"Expected RecipientNotWhitelisted, got {atk2['solidity_custom_error']}"
        assert atk2["funds_lost_usdc"] == 0.0, f"Funds lost must be 0.0, got {atk2['funds_lost_usdc']}"
        print_pass(f"Reverted on-chain: {atk2['solidity_custom_error']} | Loss: $0.00")

        # Checkpoint 10: Red-Team Attack #3 — Malicious Infinite Approve
        print_step(10, "Red-Team #3: Malicious Infinite Token Approval (approve MAX_UINT256)")
        r = client.post("/security/redteam-attack", json={
            "scenario_id": "MALICIOUS_INFINITE_APPROVE",
            "force_onchain_execution": True,
        })
        if r.status_code != 200:
            print_fail(f"Attack scenario #3 failed: {r.text}")
        atk3 = r.json()
        assert atk3["onchain_reverted_as_expected"] is True, "Attack should have reverted on-chain"
        assert atk3["solidity_custom_error"] == "FunctionSelectorNotAllowed", f"Expected FunctionSelectorNotAllowed, got {atk3['solidity_custom_error']}"
        assert atk3["funds_lost_usdc"] == 0.0, f"Funds lost must be 0.0, got {atk3['funds_lost_usdc']}"
        print_pass(f"Reverted on-chain: {atk3['solidity_custom_error']} | Loss: $0.00")

        # Clean Reset Afterwards
        client.post("/vault/reset-demo")

    elapsed = time.time() - start_time
    print_header(f"ALL 10 CHECKPOINTS VERIFIED IN {elapsed:.2f}s -- 100% PASS RATE")
    print(f"{Colors.GREEN}{Colors.BOLD}[OK] AegisPay Smart Treasury & Milestone Escrow is 100% Demo-Ready.{Colors.END}\n")

if __name__ == "__main__":
    run_e2e_verification()
