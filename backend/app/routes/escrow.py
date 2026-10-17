import time
import uuid
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from web3 import Web3
from eth_utils import keccak

from app.config import settings
from app.schemas import (
    ApiResponse,
    EscrowItem,
    EscrowItemDTO,
    CreateEscrowRequest,
    VerifyWebhookRequest,
    WebhookTriggerRequest,
    WebhookSettlementResponse,
)
from app.blockchain import blockchain_service

router = APIRouter(tags=["Escrow Lifecycle"])


# --- Phase 2 Endpoints ---

@router.get("/escrows", response_model=List[EscrowItemDTO])
async def list_all_escrows():
    """Lists on-chain milestone escrows (newest first)"""
    return blockchain_service.list_escrows()


@router.post("/escrows/create")
async def create_escrow(payload: CreateEscrowRequest):
    """Creates a new milestone escrow on-chain via Agent session key"""
    item, tx_hash = blockchain_service.create_escrow_by_agent(payload)
    return {
        "ok": True,
        "tx_hash": tx_hash,
        "escrow": item,
    }


@router.post("/escrows/verify-webhook")
async def verify_webhook_and_settle(payload: VerifyWebhookRequest):
    """Autonomous perception & settlement endpoint triggered by CI/CD or logistics webhooks"""
    return blockchain_service.verify_and_settle_escrow(payload)


# --- Legacy Endpoints for Frontend / Backward Compatibility ---

STATUS_NAMES = {0: "NonExistent", 1: "Created", 2: "Settled", 3: "Refunded"}

@router.get("/escrow/list", response_model=ApiResponse[List[EscrowItem]])
async def legacy_list_escrows():
    """Legacy listing endpoint for React frontend"""
    dtos = blockchain_service.list_escrows()
    legacy_items: List[EscrowItem] = []
    now = int(time.time())

    for d in dtos:
        status_name = "Settled" if d.status == "SETTLED" else ("Refunded" if d.status == "REFUNDED" else "Created")
        item = EscrowItem(
            escrow_id=str(d.escrow_id),
            payer=d.vault,
            contractor=d.contractor,
            token=settings.load_deployments().get("contracts", {}).get("MockUSDC", "0x0000000000000000000000000000000000000000"),
            amount_usdc=d.total_amount_usdc,
            amount_units=int(d.total_amount_usdc * 1e6),
            tax_reserve_bps=d.tax_withholding_bps,
            tax_reserve_wallet=d.vault,
            tax_amount_usdc=d.estimated_tax_reserve_usdc,
            contractor_payout_usdc=d.estimated_contractor_payout_usdc,
            attestation_hash=d.attestation_hash,
            status=status_name,
            created_at=d.created_at,
            deadline=d.created_at + 7 * 86400,
            is_expired=now > (d.created_at + 7 * 86400),
        )
        legacy_items.append(item)

    return ApiResponse(ok=True, data=legacy_items)


@router.get("/escrow/{escrow_id}", response_model=ApiResponse[EscrowItem])
async def legacy_get_escrow(escrow_id: str):
    """Legacy single escrow retrieval"""
    dtos = blockchain_service.list_escrows()
    target = None
    for d in dtos:
        if str(d.escrow_id) == str(escrow_id) or hex(d.escrow_id) == str(escrow_id):
            target = d
            break

    if not target and dtos:
        target = dtos[0]

    if not target:
        return ApiResponse(ok=False, error="Escrow not found", error_code="ESCROW_NOT_FOUND")

    status_name = "Settled" if target.status == "SETTLED" else ("Refunded" if target.status == "REFUNDED" else "Created")
    item = EscrowItem(
        escrow_id=str(target.escrow_id),
        payer=target.vault,
        contractor=target.contractor,
        token=settings.load_deployments().get("contracts", {}).get("MockUSDC", "0x00"),
        amount_usdc=target.total_amount_usdc,
        amount_units=int(target.total_amount_usdc * 1e6),
        tax_reserve_bps=target.tax_withholding_bps,
        tax_reserve_wallet=target.vault,
        tax_amount_usdc=target.estimated_tax_reserve_usdc,
        contractor_payout_usdc=target.estimated_contractor_payout_usdc,
        attestation_hash=target.attestation_hash,
        status=status_name,
        created_at=target.created_at,
        deadline=target.created_at + 7 * 86400,
        is_expired=False,
    )
    return ApiResponse(ok=True, data=item)


@router.post("/escrow/webhook/github", response_model=ApiResponse[WebhookSettlementResponse])
async def legacy_trigger_github_webhook(payload: WebhookTriggerRequest):
    """Legacy GitHub webhook trigger"""
    try:
        eid_int = 1
        try:
            eid_int = int(payload.escrow_id)
        except Exception:
            eid_int = 1

        is_success = payload.status.lower() == "success"
        req = VerifyWebhookRequest(
            escrow_id=eid_int,
            provider="github_actions",
            repo_or_tracking_id=payload.repository,
            commit_sha_or_waybill=payload.commit_sha,
            tests_passed=is_success,
            passed_count=42,
            failed_count=0 if is_success else 3,
        )

        res = blockchain_service.verify_and_settle_escrow(req)
        if not res.get("settled"):
            return ApiResponse(
                ok=False,
                error="CI/CD test suite did not pass. Milestone settlement blocked.",
                error_code="CI_FAILED",
            )

        resp = WebhookSettlementResponse(
            escrow_id=str(eid_int),
            attestation_hash=res.get("attestation_hash", "0x" + "00"*32),
            status="Settled",
            tx_hash=res.get("tx_hash", "0x" + "00"*32),
            contractor_payout_usdc=res.get("contractor_payout_usdc", 1020.0),
            tax_withheld_usdc=res.get("tax_withheld_usdc", 180.0),
            verification_summary=f"Autonomous Settlement: Released {res.get('contractor_payout_usdc')} USDC to DevStudio.",
        )
        return ApiResponse(ok=True, data=resp)
    except Exception as e:
        return ApiResponse(ok=False, error=str(e), error_code="WEBHOOK_SETTLE_ERROR")
