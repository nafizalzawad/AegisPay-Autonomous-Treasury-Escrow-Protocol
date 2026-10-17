import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def reset_to_initial_state():
    """Ensure clean initial seeded state before running test suite"""
    res = client.post("/api/v1/vault/reset-demo")
    assert res.status_code == 200
    yield


# =========================================================================
# PHASE 2 INTEGRATION TESTS (LIVE EVM ON ANVIL)
# =========================================================================

def test_health_check():
    """1. Verifies GET /api/v1/health returns 200 and chain_connected == True"""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["chain_connected"] is True
    assert data["chain_id"] == 31337
    assert data["vault_address"].startswith("0x")


def test_get_vault_state():
    """2. Verifies initial seeded vault state (24,200 total, 120 tax reserve, 24,080 operating, 1500 max per tx)"""
    res = client.get("/api/v1/vault/state")
    assert res.status_code == 200
    data = res.json()
    assert data["chain_id"] == 31337
    assert data["total_balance_usdc"] == 24200.0
    assert data["tax_reserve_balance_usdc"] == 120.0
    assert data["operating_balance_usdc"] == 24080.0
    assert data["policy"]["max_per_tx_usdc"] == 1500.0
    assert data["policy"]["max_daily_usdc"] == 3000.0
    assert data["policy"]["spent_today_usdc"] == 0.0
    assert data["policy"]["remaining_daily_usdc"] == 3000.0


def test_list_seeded_escrows():
    """3. Verifies Escrow #1 (800.0 USDC, SETTLED) is returned in GET /api/v1/escrows"""
    res = client.get("/api/v1/escrows")
    assert res.status_code == 200
    escrows = res.json()
    assert len(escrows) >= 1
    # Find Escrow #1
    escrow_1 = next((e for e in escrows if e["escrow_id"] == 1), None)
    assert escrow_1 is not None
    assert escrow_1["total_amount_usdc"] == 800.0
    assert escrow_1["status"] == "SETTLED"
    assert escrow_1["tax_withholding_bps"] == 1500


def test_create_escrow_happy_path():
    """4. Calls POST /api/v1/escrows/create with 1200.0 USDC for DevStudio.
    Verifies HTTP 200, non-empty tx_hash, Escrow #2 status is FUNDED, and spent_today increased by 1200.0.
    """
    payload = {
        "contractor_address": settings.CONTRACTOR_ADDRESS,
        "amount_usdc": 1200.0,
        "tax_withholding_bps": 1500,
        "description": "Lock 1,200 USDC for DevStudio full-stack CI/CD delivery",
    }
    res = client.post("/api/v1/escrows/create", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["tx_hash"].startswith("0x")
    escrow = body["escrow"]
    assert escrow["escrow_id"] == 2
    assert escrow["total_amount_usdc"] == 1200.0
    assert escrow["status"] == "FUNDED"

    # Verify spent_today_usdc updated in vault state
    vault_res = client.get("/api/v1/vault/state")
    assert vault_res.status_code == 200
    vault_data = vault_res.json()
    assert vault_data["policy"]["spent_today_usdc"] == 1200.0
    assert vault_data["policy"]["remaining_daily_usdc"] == 1800.0


def test_verify_webhook_failed_ci_does_not_settle():
    """5. Calls POST /api/v1/escrows/verify-webhook on Escrow #2 with tests_passed=False.
    Verifies settled == False and Escrow #2 remains FUNDED.
    """
    payload = {
        "escrow_id": 2,
        "provider": "github_actions",
        "repo_or_tracking_id": "AegisPay/smart-treasury-suite",
        "commit_sha_or_waybill": "4a9f3b18c72e9d0e",
        "tests_passed": False,
        "passed_count": 39,
        "failed_count": 3,
    }
    res = client.post("/api/v1/escrows/verify-webhook", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["settled"] is False
    assert body["reason"] == "CI_TESTS_FAILED"

    # Verify escrow remains FUNDED
    escrows_res = client.get("/api/v1/escrows")
    escrow_2 = next((e for e in escrows_res.json() if e["escrow_id"] == 2), None)
    assert escrow_2 is not None
    assert escrow_2["status"] == "FUNDED"


def test_verify_webhook_passing_ci_settles_and_splits_tax():
    """6. Calls POST /api/v1/escrows/verify-webhook on Escrow #2 with tests_passed=True.
    Verifies settled == True, contractor_payout_usdc == 1020.0, tax_withheld_usdc == 180.0,
    Contractor balance increased by 1020.0, and Vault tax_reserve increased from 120.0 to 300.0.
    """
    state_before = client.get("/api/v1/vault/state").json()
    initial_contractor_bal = state_before["contractor_balance_usdc"]
    initial_tax_reserve = state_before["tax_reserve_balance_usdc"]
    assert initial_tax_reserve == 120.0

    payload = {
        "escrow_id": 2,
        "provider": "github_actions",
        "repo_or_tracking_id": "AegisPay/smart-treasury-suite",
        "commit_sha_or_waybill": "4a9f3b18c72e9d0e",
        "tests_passed": True,
        "passed_count": 42,
        "failed_count": 0,
    }
    res = client.post("/api/v1/escrows/verify-webhook", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["settled"] is True
    assert body["tx_hash"].startswith("0x")
    assert body["attestation_hash"].startswith("0x")
    assert body["contractor_payout_usdc"] == 1020.0
    assert body["tax_withheld_usdc"] == 180.0

    state_after = client.get("/api/v1/vault/state").json()
    assert state_after["tax_reserve_balance_usdc"] == initial_tax_reserve + 180.0
    assert state_after["tax_reserve_balance_usdc"] == 300.0
    assert state_after["contractor_balance_usdc"] == initial_contractor_bal + 1020.0


def test_create_escrow_exceeding_per_tx_cap_reverts():
    """7. Calls POST /api/v1/escrows/create with 2000.0 USDC (> 1500.0 cap).
    Verifies HTTP 400/422 with error code containing PerTxSpendLimitExceeded and logs an ONCHAIN_REVERT event.
    """
    payload = {
        "contractor_address": settings.CONTRACTOR_ADDRESS,
        "amount_usdc": 2000.0,
        "tax_withholding_bps": 1500,
        "description": "Unauthorized drain attempt exceeding 1500 USDC cap",
    }
    res = client.post("/api/v1/escrows/create", json=payload)
    assert res.status_code in (400, 422)
    detail = res.json()
    assert "PerTxSpendLimitExceeded" in str(detail)

    audit_res = client.get("/api/v1/vault/audit-log")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    revert_events = [e for e in logs if e["event_type"] == "ONCHAIN_REVERT"]
    assert len(revert_events) > 0
    assert "PerTxSpendLimitExceeded" in revert_events[0]["summary"]


# =========================================================================
# PHASE 3: AI BRAIN, 2-STAGE FIREWALL & RED-TEAM TESTS
# =========================================================================

def test_intent_parse_and_simulate_valid_escrow():
    """8. Sends natural language prompt:
    'Create a 1,200 USDC milestone escrow for DevStudio with 15% tax withholding; release when GitHub CI tests pass',
    execute_immediately=False.
    Verifies overall_approved == True, stage1_offchain_passed == True, stage2_onchain_simulation_passed == True,
    amount_usdc == 1200.0, tax_withholding_bps == 1500.
    """
    prompt = "Create a 1,200 USDC milestone escrow for DevStudio with 15% tax withholding; release when GitHub CI tests pass"
    res = client.post(
        "/api/v1/intent/parse-and-simulate",
        json={"prompt": prompt, "execute_immediately": False},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    parsed = body["parsed_intent"]
    assert parsed["amount_usdc"] == 1200.0
    assert parsed["tax_withholding_bps"] == 1500
    assert parsed["action_type"] == "CREATE_ESCROW"
    assert parsed["recipient_address"].lower() == settings.CONTRACTOR_ADDRESS.lower()

    fw = body["firewall"]
    assert fw["overall_approved"] is True
    assert fw["stage1_offchain_passed"] is True
    assert fw["stage2_onchain_simulation_passed"] is True
    assert fw["evm_simulation_status"] == "SUCCESS"
    assert fw["evm_revert_reason"] is None
    assert fw["risk_level"] == "LOW"
    assert body["executed"] is False


def test_intent_parse_and_execute_escrow_end_to_end():
    """9. Same natural language prompt with execute_immediately=True.
    Verifies executed == True, valid tx_hash, and new FUNDED escrow on-chain.
    """
    prompt = "Create a 1,200 USDC milestone escrow for DevStudio with 15% tax withholding; release when GitHub CI tests pass"
    res = client.post(
        "/api/v1/intent/parse-and-simulate",
        json={"prompt": prompt, "execute_immediately": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["executed"] is True
    assert body["tx_hash"] is not None
    assert body["tx_hash"].startswith("0x")
    assert body["escrow"] is not None
    assert body["escrow"]["status"] == "FUNDED"


def test_redteam_scenario_1_prompt_injection_over_limit():
    """10. Calls POST /api/v1/security/redteam-attack with PROMPT_INJECTION_OVER_LIMIT.
    Verifies onchain_reverted_as_expected == True, solidity_custom_error == 'PerTxSpendLimitExceeded',
    and funds_lost_usdc == 0.0.
    """
    res = client.post(
        "/api/v1/security/redteam-attack",
        json={"scenario_id": "PROMPT_INJECTION_OVER_LIMIT", "force_onchain_execution": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scenario_id"] == "PROMPT_INJECTION_OVER_LIMIT"
    assert body["onchain_reverted_as_expected"] is True
    assert body["solidity_custom_error"] == "PerTxSpendLimitExceeded"
    assert body["funds_lost_usdc"] == 0.0
    assert body["vault_balance_before_usdc"] == body["vault_balance_after_usdc"]
    assert body["parsed_intent"]["prompt_injection_detected"] is True
    assert len(body["parsed_intent"]["injection_indicators"]) > 0


def test_redteam_scenario_2_unwhitelisted_phishing_recipient():
    """11. Calls POST /api/v1/security/redteam-attack with UNWHITELISTED_PHISHING_RECIPIENT.
    Verifies onchain_reverted_as_expected == True, solidity_custom_error == 'RecipientNotWhitelisted',
    and funds_lost_usdc == 0.0.
    """
    res = client.post(
        "/api/v1/security/redteam-attack",
        json={"scenario_id": "UNWHITELISTED_PHISHING_RECIPIENT", "force_onchain_execution": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scenario_id"] == "UNWHITELISTED_PHISHING_RECIPIENT"
    assert body["onchain_reverted_as_expected"] is True
    assert body["solidity_custom_error"] == "RecipientNotWhitelisted"
    assert body["funds_lost_usdc"] == 0.0
    assert body["vault_balance_before_usdc"] == body["vault_balance_after_usdc"]


def test_redteam_scenario_3_malicious_infinite_approve():
    """12. Calls POST /api/v1/security/redteam-attack with MALICIOUS_INFINITE_APPROVE.
    Verifies onchain_reverted_as_expected == True, solidity_custom_error == 'FunctionSelectorNotAllowed',
    and funds_lost_usdc == 0.0.
    """
    res = client.post(
        "/api/v1/security/redteam-attack",
        json={"scenario_id": "MALICIOUS_INFINITE_APPROVE", "force_onchain_execution": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scenario_id"] == "MALICIOUS_INFINITE_APPROVE"
    assert body["onchain_reverted_as_expected"] is True
    assert body["solidity_custom_error"] == "FunctionSelectorNotAllowed"
    assert body["funds_lost_usdc"] == 0.0
    assert body["vault_balance_before_usdc"] == body["vault_balance_after_usdc"]


def test_reset_demo_restores_clean_state():
    """13. Calls POST /api/v1/vault/reset-demo and verifies vault balances and escrow count return to initial values."""
    res = client.post("/api/v1/vault/reset-demo")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True

    # Check vault state
    vault_res = client.get("/api/v1/vault/state")
    assert vault_res.status_code == 200
    v = vault_res.json()
    assert v["total_balance_usdc"] == 24200.0
    assert v["operating_balance_usdc"] == 24080.0
    assert v["tax_reserve_balance_usdc"] == 120.0
    assert v["policy"]["spent_today_usdc"] == 0.0
    assert v["policy"]["remaining_daily_usdc"] == 3000.0

    # Check escrows count is reset to 1
    escrows_res = client.get("/api/v1/escrows")
    assert escrows_res.status_code == 200
    escrows = escrows_res.json()
    assert len(escrows) == 1
    assert escrows[0]["escrow_id"] == 1
    assert escrows[0]["status"] == "SETTLED"


# =========================================================================
# LEGACY COMPATIBILITY & REGRESSION TESTS
# =========================================================================

def test_intent_parse_deterministic():
    prompt = "Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve"
    res = client.post("/api/intent/parse", json={"text": prompt})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    data = body["data"]
    assert data["amount_usdc"] == 1200.0
    assert data["tax_reserve_bps"] == 1500
    assert data["tax_amount_usdc"] == 180.0
    assert data["contractor_payout_usdc"] == 1020.0
    assert data["condition_type"] == "github_ci_cd"
    assert data["recipient"].lower() == settings.CONTRACTOR_ADDRESS.lower()


def test_redteam_attacks():
    scenarios = [
        ("attack_drain_10k", "FW-01"),
        ("attack_unwhitelisted_hacker", "FW-03"),
        ("attack_infinite_approval", "FW-04"),
    ]

    for scenario_id, expected_rule in scenarios:
        res = client.post(
            "/api/security/redteam/attack", json={"scenario_id": scenario_id}
        )
        assert res.status_code == 200
        body = res.json()
        assert body["ok"] is True
        data = body["data"]
        assert data["offchain_firewall_status"] == "BLOCKED"
        assert data["onchain_simulation_status"] == "REVERTED"
        assert data["asset_loss"] == 0.0
        assert data["defense_verdict"] == "PREVENTED"
        assert data["treasury_balance_before"] == data["treasury_balance_after"]
