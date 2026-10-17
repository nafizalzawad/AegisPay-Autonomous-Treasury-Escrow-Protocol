from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from web3 import Web3

from app.config import settings
from app.schemas import ApiResponse, VaultStatusResponse, PolicyState, FaucetRequest
from app.blockchain import blockchain_service

router = APIRouter(prefix="/vault", tags=["Vault & Policy"])


@router.get("/status", response_model=ApiResponse[VaultStatusResponse])
async def get_vault_status():
    """Returns real-time treasury balances, tax reserve metrics, and active session policy"""
    try:
        contracts = blockchain_service.get_contract_addresses()
        vault_addr = contracts.get("AegisVault", "")
        usdc_addr = contracts.get("MockUSDC", "")
        escrow_addr = contracts.get("MilestoneEscrow", "")

        usdc_contract = blockchain_service.get_usdc_contract()
        vault_contract = blockchain_service.get_vault_contract()

        usdc_balance = 0.0
        usdc_balance_units = 0
        tax_reserve_balance = 0.0
        tax_reserve_units = 0
        eth_balance = 0.0

        # Default policy parameters
        policy_agent = settings.AGENT_ADDRESS
        max_per_tx_units = 1500 * 10**6
        max_daily_units = 3000 * 10**6
        current_daily_spent_units = 0
        valid_until = 1893456000  # Future timestamp
        tax_bps = 1500
        tax_wallet = vault_addr or settings.OWNER_ADDRESS
        is_active = True
        available_daily_units = max_daily_units

        whitelisted_recipients = [settings.CONTRACTOR_ADDRESS]
        whitelisted_targets = [usdc_addr, escrow_addr]
        whitelisted_selectors = [
            "0xa9059cbb",  # transfer
            "0x095ea7b3",  # approve
            "0x0a1d5e6d",  # createEscrow
            "0xb20616e0",  # settleEscrow
            "0x47aed508",  # refundEscrow
        ]

        if blockchain_service.is_connected() and vault_addr and usdc_contract and vault_contract:
            try:
                raw_usdc_bal = usdc_contract.functions.balanceOf(
                    Web3.to_checksum_address(vault_addr)
                ).call()
                usdc_balance_units = int(raw_usdc_bal)
                usdc_balance = round(raw_usdc_bal / 10**6, 2)

                raw_tax_bal = vault_contract.functions.taxReserveBalance().call()
                tax_reserve_units = int(raw_tax_bal)
                tax_reserve_balance = round(raw_tax_bal / 10**6, 2)

                raw_eth = blockchain_service.w3.eth.get_balance(
                    Web3.to_checksum_address(vault_addr)
                )
                eth_balance = round(raw_eth / 10**18, 4)

                # Fetch on-chain policy
                policy_raw = vault_contract.functions.policy().call()
                # policy returns: (agent, maxPerTx, maxDaily, currentDailySpent, lastDailyReset, validUntil, taxReserveBps, taxReserveWallet, isActive)
                policy_agent = policy_raw[0]
                max_per_tx_units = int(policy_raw[1])
                max_daily_units = int(policy_raw[2])
                current_daily_spent_units = int(policy_raw[3])
                valid_until = int(policy_raw[5])
                tax_bps = int(policy_raw[6])
                tax_wallet = policy_raw[7]
                is_active = bool(policy_raw[8])

                raw_avail = vault_contract.functions.getAvailableDailyLimit().call()
                available_daily_units = int(raw_avail)
            except Exception as e:
                # Fallback to simulated defaults if contract queries fail
                pass
        else:
            # Fallback values when chain is offline or initializing
            usdc_balance = 100000.0
            usdc_balance_units = 100000 * 10**6
            eth_balance = 10.0

        policy_state = PolicyState(
            agent=policy_agent,
            max_per_tx_usdc=round(max_per_tx_units / 10**6, 2),
            max_per_tx_units=max_per_tx_units,
            max_daily_usdc=round(max_daily_units / 10**6, 2),
            max_daily_units=max_daily_units,
            current_daily_spent_usdc=round(current_daily_spent_units / 10**6, 2),
            current_daily_spent_units=current_daily_spent_units,
            available_daily_usdc=round(available_daily_units / 10**6, 2),
            valid_until=valid_until,
            is_expired=False,
            tax_reserve_bps=tax_bps,
            tax_reserve_wallet=tax_wallet,
            is_active=is_active,
            whitelisted_recipients=whitelisted_recipients,
            whitelisted_targets=whitelisted_targets,
            whitelisted_selectors=whitelisted_selectors,
        )

        resp = VaultStatusResponse(
            vault_address=vault_addr or "0x0000000000000000000000000000000000000000",
            usdc_token_address=usdc_addr or "0x0000000000000000000000000000000000000000",
            escrow_contract_address=escrow_addr or "0x0000000000000000000000000000000000000000",
            usdc_balance=usdc_balance,
            usdc_balance_units=usdc_balance_units,
            native_eth_balance=eth_balance,
            tax_reserve_balance=tax_reserve_balance,
            tax_reserve_balance_units=tax_reserve_units,
            policy=policy_state,
            network="Anvil Local Sandbox",
            chain_id=settings.CHAIN_ID,
        )

        return ApiResponse(ok=True, data=resp)
    except Exception as e:
        return ApiResponse(ok=False, error=str(e), error_code="VAULT_STATUS_ERROR")


@router.post("/faucet", response_model=ApiResponse[Dict[str, Any]])
async def request_faucet(payload: FaucetRequest):
    """Mints sandbox MockUSDC to test accounts (up to 5,000 USDC)"""
    try:
        contracts = blockchain_service.get_contract_addresses()
        usdc_addr = contracts.get("MockUSDC")
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
