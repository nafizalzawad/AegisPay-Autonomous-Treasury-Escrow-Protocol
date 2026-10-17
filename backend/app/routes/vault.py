from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from web3 import Web3

from app.config import settings
from app.schemas import (
    ApiResponse,
    VaultStatusResponse,
    PolicyState,
    FaucetRequest,
    VaultStateResponse,
    AuditEventDTO,
)
from app.blockchain import blockchain_service

router = APIRouter(prefix="/vault", tags=["Vault & Policy"])


@router.get("/state", response_model=VaultStateResponse)
async def get_vault_state():
    """Returns live on-chain AegisVault state, token balances, and active session policy"""
    return blockchain_service.get_vault_state()


@router.get("/audit-log", response_model=List[AuditEventDTO])
async def get_vault_audit_log(limit: int = 50):
    """Returns chronological audit log entries"""
    return blockchain_service.get_audit_dtos(limit=limit)


@router.post("/reset-demo")
async def reset_demo():
    """Re-deploys and re-seeds the sandbox environment to clean initial balances"""
    return blockchain_service.reset_demo()


# Legacy / backward-compatible endpoints

@router.get("/status", response_model=ApiResponse[VaultStatusResponse])
async def get_vault_status():
    """Legacy endpoint: Returns real-time treasury balances, tax reserve metrics, and active session policy"""
    try:
        state = blockchain_service.get_vault_state()

        policy_state = PolicyState(
            agent=state.policy.session_key_address,
            max_per_tx_usdc=state.policy.max_per_tx_usdc,
            max_per_tx_units=int(state.policy.max_per_tx_usdc * 1e6),
            max_daily_usdc=state.policy.max_daily_usdc,
            max_daily_units=int(state.policy.max_daily_usdc * 1e6),
            current_daily_spent_usdc=state.policy.spent_today_usdc,
            current_daily_spent_units=int(state.policy.spent_today_usdc * 1e6),
            available_daily_usdc=state.policy.remaining_daily_usdc,
            valid_until=state.policy.expires_at,
            is_expired=False,
            tax_reserve_bps=1500,
            tax_reserve_wallet=state.vault_address,
            is_active=state.policy.is_active,
            whitelisted_recipients=[r["address"] for r in state.policy.whitelisted_recipients],
            whitelisted_targets=[state.usdc_address, state.escrow_contract_address],
            whitelisted_selectors=[s["selector"] for s in state.policy.allowed_selectors],
        )

        resp = VaultStatusResponse(
            vault_address=state.vault_address,
            usdc_token_address=state.usdc_address,
            escrow_contract_address=state.escrow_contract_address,
            usdc_balance=state.total_balance_usdc,
            usdc_balance_units=int(state.total_balance_usdc * 1e6),
            native_eth_balance=10.0,
            tax_reserve_balance=state.tax_reserve_balance_usdc,
            tax_reserve_balance_units=int(state.tax_reserve_balance_usdc * 1e6),
            policy=policy_state,
            network="Anvil Local Sandbox",
            chain_id=state.chain_id,
        )

        return ApiResponse(ok=True, data=resp)
    except Exception as e:
        return ApiResponse(ok=False, error=str(e), error_code="VAULT_STATUS_ERROR")


@router.post("/faucet", response_model=ApiResponse[Dict[str, Any]])
async def request_faucet(payload: FaucetRequest):
    """Mints sandbox MockUSDC to test accounts (up to 5,000 USDC)"""
    try:
        contracts = blockchain_service.get_contract_addresses()
        usdc_addr = contracts.get("MockUSDC") or contracts.get("mockUsdc")
        if not usdc_addr or not blockchain_service.is_connected():
            return ApiResponse(
                ok=True,
                data={
                    "status": "SIMULATED",
                    "recipient": payload.recipient,
                    "amount_usdc": payload.amount_usdc,
                    "tx_hash": "0xsimulatedfaucet0000000000000000000000000000000000000000000000000000",
                },
            )

        amount_units = int(payload.amount_usdc * 10**6)
        usdc_contract = blockchain_service.get_usdc_contract()
        calldata = usdc_contract.encode_abi(
            "faucet",
            args=[Web3.to_checksum_address(payload.recipient), amount_units],
        )

        tx_hash, receipt = blockchain_service.send_owner_tx(usdc_addr, calldata)

        blockchain_service.record_audit_event(
            event_type="FAUCET_DISPENSED",
            actor=payload.recipient,
            summary=f"Dispensed {payload.amount_usdc:,.2f} MockUSDC to {payload.recipient}",
            details={"amount": payload.amount_usdc, "recipient": payload.recipient},
            tx_hash=tx_hash,
            status="SUCCESS",
        )

        return ApiResponse(
            ok=True,
            data={
                "status": "SUCCESS",
                "recipient": payload.recipient,
                "amount_usdc": payload.amount_usdc,
                "tx_hash": tx_hash,
            },
        )
    except Exception as e:
        return ApiResponse(ok=False, error=str(e), error_code="FAUCET_ERROR")
