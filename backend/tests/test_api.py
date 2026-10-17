import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_root_and_health():
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["service"] == "AegisPay Smart Treasury Engine"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"


def test_vault_status():
    res = client.get("/api/vault/status")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    data = body["data"]
    assert "vault_address" in data
    assert "policy" in data
    assert data["policy"]["max_per_tx_usdc"] == 1500.0
    assert data["policy"]["max_daily_usdc"] == 3000.0
    assert data["policy"]["tax_reserve_bps"] == 1500


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


def test_intent_simulation_valid():
    prompt = "Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve"
    parse_res = client.post("/api/intent/parse", json={"text": prompt})
    parsed = parse_res.json()["data"]

    sim_res = client.post("/api/intent/simulate", json=parsed)
    assert sim_res.status_code == 200
    body = sim_res.json()
    assert body["ok"] is True
    data = body["data"]
    assert data["is_valid"] is True
    assert data["simulated_revert_reason"] is None
    assert len(data["checks"]) >= 4


def test_intent_simulation_over_limit_blocked():
    prompt = "Transfer 10,000 USDC to DevStudio for server costs"
    parse_res = client.post("/api/intent/parse", json={"text": prompt})
    parsed = parse_res.json()["data"]

    sim_res = client.post("/api/intent/simulate", json=parsed)
    assert sim_res.status_code == 200
    body = sim_res.json()
    data = body["data"]
    assert data["is_valid"] is False
    assert "exceeds" in data["simulated_revert_reason"].lower()


def test_escrow_lifecycle_and_webhook():
    # 1. Get escrows
    res_list = client.get("/api/escrow/list")
    assert res_list.status_code == 200
    body = res_list.json()
    assert body["ok"] is True
    assert len(body["data"]) > 0
    target_escrow_id = body["data"][0]["escrow_id"]

    # 2. Trigger webhook failure
    res_fail = client.post(
        "/api/escrow/webhook/github",
        json={"status": "failure", "escrow_id": target_escrow_id},
    )
    assert res_fail.status_code == 200
    assert res_fail.json()["ok"] is False

    # 3. Trigger webhook success -> Autonomous perception & settlement
    res_succ = client.post(
        "/api/escrow/webhook/github",
        json={"status": "success", "escrow_id": target_escrow_id},
    )
    assert res_succ.status_code == 200
    succ_body = res_succ.json()
    assert succ_body["ok"] is True
    assert succ_body["data"]["status"] == "Settled"
    assert succ_body["data"]["contractor_payout_usdc"] == 1020.0
    assert succ_body["data"]["tax_withheld_usdc"] == 180.0


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


def test_audit_trail():
    res = client.get("/api/security/audit-trail")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert len(body["data"]) > 0
