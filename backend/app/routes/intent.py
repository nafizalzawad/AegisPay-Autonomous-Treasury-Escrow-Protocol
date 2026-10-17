import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter
from web3 import Web3

from app.config import settings
from app.schemas import (
    ApiResponse,
    NaturalLanguageIntentRequest,
    ParsedIntent,
    ParsedIntentDTO,
    SimulationResult,
    SimulationCheck,
    IntentExecutionRequest,
    IntentExecutionResponse,
    IntentParseAndSimulateRequest,
    IntentParseAndSimulateResponse,
    CreateEscrowRequest,
    EscrowItemDTO,
)
from app.agent_parser import agent_parser
from app.firewall import firewall
from app.blockchain import blockchain_service

router = APIRouter(tags=["Autonomous Intent"])


# --- Phase 3 Primary Intent Endpoint ---

@router.post("/intent/parse-and-simulate", response_model=IntentParseAndSimulateResponse)
async def parse_and_simulate_intent(payload: IntentParseAndSimulateRequest):
    """Parses commercial natural language instruction, executes 2-stage firewall simulation,
    and optionally executes on-chain if approved.
    """
    parsed = await agent_parser.parse_intent_dto(payload.prompt)
    sim_result = firewall.evaluate_intent(parsed)

    executed = False
    tx_hash: Optional[str] = None
    created_escrow: Optional[EscrowItemDTO] = None

    if payload.execute_immediately:
        if sim_result.overall_approved:
            if parsed.action_type == "CREATE_ESCROW":
                create_req = CreateEscrowRequest(
                    contractor_address=parsed.recipient_address,
                    amount_usdc=parsed.amount_usdc,
                    tax_withholding_bps=parsed.tax_withholding_bps,
                    description=parsed.deliverable_description,
                )
                created_escrow, tx_hash = blockchain_service.create_escrow_by_agent(create_req)
                executed = True
            else:
                # Direct transfer execution
                contracts = blockchain_service.get_contract_addresses()
                vault_addr = contracts.get("AegisVault") or contracts.get("aegisVault")
                usdc_addr = contracts.get("MockUSDC") or contracts.get("mockUsdc")
                vault_contract = blockchain_service.get_vault_contract()
                usdc_contract = blockchain_service.get_usdc_contract()
                amount_units = int(round(parsed.amount_usdc * 1e6))

                transfer_calldata = usdc_contract.encode_abi(
                    "transfer",
                    args=[Web3.to_checksum_address(parsed.recipient_address), amount_units],
                )
                exec_calldata = vault_contract.encode_abi(
                    "executeByAgent",
                    args=[
                        Web3.to_checksum_address(usdc_addr),
                        bytes.fromhex(transfer_calldata[2:]),
                        Web3.to_checksum_address(parsed.recipient_address),
                        amount_units,
                        b"\x00" * 32,
                    ],
                )
                tx_hash, _ = blockchain_service.send_agent_tx(vault_addr, exec_calldata)
                executed = True
        else:
            blockchain_service.record_audit_dto(
                event_type="FIREWALL_BLOCKED",
                severity="WARNING",
                summary=f"Execution blocked by 2-Stage Firewall: {sim_result.evm_revert_reason or 'Off-chain guardrail triggered'}",
                metadata={
                    "prompt": payload.prompt,
                    "revert_reason": sim_result.evm_revert_reason,
                    "risk_level": sim_result.risk_level,
                },
            )

    return IntentParseAndSimulateResponse(
        ok=True,
        parsed_intent=parsed,
        firewall=sim_result,
        executed=executed,
        tx_hash=tx_hash,
        escrow=created_escrow,
    )


# --- Legacy Compatibility Endpoints ---

@router.post("/intent/parse", response_model=ApiResponse[ParsedIntent])
async def legacy_parse_intent(payload: NaturalLanguageIntentRequest):
    """Legacy parser endpoint returning ParsedIntent"""
    try:
        parsed = await agent_parser.parse_intent(payload.text)
        blockchain_service.record_audit_event(
            event_type="INTENT_PARSED",
            actor="AI_AGENT_PARSER",
            summary=f"Parsed commercial agreement: Lock {parsed.amount_usdc:,.2f} USDC for {parsed.recipient_label}",
            details={
                "amount": parsed.amount_usdc,
                "recipient": parsed.recipient,
                "tax_reserve_bps": parsed.tax_reserve_bps,
                "condition": parsed.condition_type,
            },
            status="SUCCESS",
        )
        return ApiResponse(ok=True, data=parsed)
    except Exception as e:
        return ApiResponse(ok=False, error=str(e), error_code="INTENT_PARSE_ERROR")


@router.post("/intent/simulate", response_model=ApiResponse[SimulationResult])
async def legacy_simulate_intent(intent: ParsedIntent):
    """Legacy simulation endpoint returning SimulationResult"""
    try:
        parsed_dto = await agent_parser.parse_intent_dto(intent.raw_prompt)
        parsed_dto.amount_usdc = intent.amount_usdc
        parsed_dto.recipient_address = intent.recipient

        sim_res = firewall.evaluate_intent(parsed_dto)
        checks: List[SimulationCheck] = [
            SimulationCheck(
                name=c.check_name,
                passed=c.passed,
                detail=c.detail,
            )
            for c in sim_res.stage1_checks
        ]

        result = SimulationResult(
            is_valid=sim_res.overall_approved,
            gas_estimate=sim_res.estimated_gas,
            simulated_revert_reason=sim_res.evm_revert_reason
            if not sim_res.overall_approved
            else None,
            checks=checks,
        )
        return ApiResponse(ok=True, data=result)
    except Exception as e:
        return ApiResponse(ok=False, error=str(e), error_code="SIMULATION_ERROR")
