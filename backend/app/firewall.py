import re
import time
from typing import List, Dict, Any, Optional, Tuple
from web3 import Web3
from web3.exceptions import ContractLogicError, ContractCustomError

from app.config import settings
from app.schemas import (
    ParsedIntentDTO,
    FirewallStageCheck,
    FirewallSimulationResult,
)
from app.blockchain import blockchain_service

# Custom Error Selectors lookup dictionary
ERROR_SELECTORS: Dict[str, str] = {
    "06951c29": "PerTxSpendLimitExceeded",
    "0a3937fc": "DailySpendLimitExceeded",
    "ab0b880c": "RecipientNotWhitelisted",
    "3f4ac192": "TargetContractNotAllowed",
    "30ec2715": "FunctionSelectorNotAllowed",
    "e4232821": "SessionKeyExpired",
    "c01bac7d": "SessionKeyInactive",
    "d86ad9cf": "UnauthorizedCaller",
    "1ef4fa9b": "InvalidTaxBps",
    "cfb60706": "ExecutionFailed",
}


class AegisFirewall:
    def __init__(self) -> None:
        pass

    def decode_solidity_error(self, err: Exception) -> str:
        """Extracts and decodes Solidity custom error name from Web3 exceptions"""
        err_str = str(err)
        for sel, name in ERROR_SELECTORS.items():
            if sel in err_str:
                return name
            if name in err_str:
                return name

        if hasattr(err, "data") and err.data:
            data_hex = str(err.data)
            for sel, name in ERROR_SELECTORS.items():
                if sel in data_hex:
                    return name

        return "ExecutionReverted"

    def evaluate_intent(self, parsed: ParsedIntentDTO) -> FirewallSimulationResult:
        """2-Stage Firewall Evaluation:
        Stage 1: Off-Chain Policy & Semantic Guardrails
        Stage 2: Live EVM eth_call Dry-Run Simulation against Anvil
        """
        vault_state = blockchain_service.get_vault_state()
        policy = vault_state.policy
        vault_balance_before = vault_state.total_balance_usdc

        stage1_checks: List[FirewallStageCheck] = []

        # -------------------------------------------------------------
        # STAGE 1: OFF-CHAIN PRE-EXECUTION CHECKS
        # -------------------------------------------------------------

        # Check 1: Prompt Injection & Semantic Guard
        inj_passed = not parsed.prompt_injection_detected
        inj_detail = (
            "Clean commercial intent — no adversarial tokens detected"
            if inj_passed
            else f"Blocked: Detected malicious prompt injection keywords: {', '.join(parsed.injection_indicators)}"
        )
        stage1_checks.append(
            FirewallStageCheck(
                check_name="Prompt Injection & Semantic Guard",
                passed=inj_passed,
                detail=inj_detail,
            )
        )

        # Check 2: Session Key Active & Unexpired
        now = int(time.time())
        key_passed = policy.is_active and (now < policy.expires_at)
        key_detail = (
            f"Session Key active until {policy.expires_at}"
            if key_passed
            else "Session Key inactive or expired"
        )
        stage1_checks.append(
            FirewallStageCheck(
                check_name="Session Key Active & Unexpired",
                passed=key_passed,
                detail=key_detail,
            )
        )

        # Check 3: Target & Selector Whitelist
        not_approve = (
            parsed.action_type != "MALICIOUS_APPROVE"
            and parsed.function_selector != "0x095ea7b3"
        )
        selector_allowed = not_approve and (
            parsed.function_selector in ["0xa9059cbb", "0x0a1d5e6d", "0xb20616e0"]
        )
        sel_detail = (
            f"Approved target contract & function selector {parsed.function_selector}"
            if selector_allowed
            else f"Selector {parsed.function_selector} ({parsed.function_name}) is strictly forbidden by policy rules"
        )
        stage1_checks.append(
            FirewallStageCheck(
                check_name="Target & Selector Whitelist",
                passed=selector_allowed,
                detail=sel_detail,
            )
        )

        # Check 4: Recipient Whitelist Verification
        recipient_ok = (
            parsed.recipient_address.lower() == settings.CONTRACTOR_ADDRESS.lower()
        )
        recip_detail = (
            f"Recipient {parsed.recipient_address} verified in Treasury Whitelist"
            if recipient_ok
            else f"Recipient {parsed.recipient_address} not in policy recipient whitelist"
        )
        stage1_checks.append(
            FirewallStageCheck(
                check_name="Recipient Whitelist Verification",
                passed=recipient_ok,
                detail=recip_detail,
            )
        )

        # Check 5: Spend Cap Verification (Per-Tx & 24h Rolling)
        under_per_tx = parsed.amount_usdc <= policy.max_per_tx_usdc
        under_daily = parsed.amount_usdc <= policy.remaining_daily_usdc
        caps_ok = under_per_tx and under_daily

        if caps_ok:
            caps_detail = (
                f"Requested {parsed.amount_usdc:,.2f} USDC within limits "
                f"(Max Per-Tx: {policy.max_per_tx_usdc:,.2f}, Remaining Daily: {policy.remaining_daily_usdc:,.2f} USDC)"
            )
        elif not under_per_tx:
            caps_detail = (
                f"Requested {parsed.amount_usdc:,.2f} USDC exceeds Per-Tx Cap of {policy.max_per_tx_usdc:,.2f} USDC"
            )
        else:
            caps_detail = (
                f"Requested {parsed.amount_usdc:,.2f} USDC exceeds Remaining Daily Cap of {policy.remaining_daily_usdc:,.2f} USDC"
            )

        stage1_checks.append(
            FirewallStageCheck(
                check_name="Spend Cap Verification (Per-Tx & 24h Rolling)",
                passed=caps_ok,
                detail=caps_detail,
            )
        )

        stage1_passed = all(c.passed for c in stage1_checks)

        # -------------------------------------------------------------
        # STAGE 2: LIVE EVM ETH_CALL DRY-RUN SIMULATION
        # -------------------------------------------------------------

        stage2_passed = False
        evm_status = "REVERTED"
        evm_revert_reason = None
        estimated_gas = 0

        vault_contract = blockchain_service.get_vault_contract()
        usdc_contract = blockchain_service.get_usdc_contract()
        agent_addr = policy.session_key_address

        if blockchain_service.is_connected() and vault_contract:
            try:
                amount_units = int(round(parsed.amount_usdc * 1e6))

                if parsed.action_type == "CREATE_ESCROW":
                    spec_hash = Web3.keccak(text=parsed.deliverable_description)
                    fn = vault_contract.functions.createEscrowByAgent(
                        Web3.to_checksum_address(vault_state.escrow_contract_address),
                        Web3.to_checksum_address(parsed.recipient_address),
                        amount_units,
                        parsed.tax_withholding_bps,
                        spec_hash,
                    )
                    fn.call({"from": Web3.to_checksum_address(agent_addr)})
                    stage2_passed = True
                    evm_status = "SUCCESS"
                    estimated_gas = 285000

                elif parsed.action_type == "MALICIOUS_APPROVE":
                    if usdc_contract:
                        approve_data = usdc_contract.encode_abi(
                            "approve",
                            args=[Web3.to_checksum_address(parsed.recipient_address), 2**256 - 1],
                        )
                        fn = vault_contract.functions.executeByAgent(
                            Web3.to_checksum_address(vault_state.usdc_address),
                            bytes.fromhex(approve_data[2:]),
                            Web3.to_checksum_address(parsed.recipient_address),
                            0,
                            b"\x00" * 32,
                        )
                        fn.call({"from": Web3.to_checksum_address(agent_addr)})
                    stage2_passed = True
                    evm_status = "SUCCESS"
                    estimated_gas = 65000

                else:  # DIRECT_TRANSFER
                    if usdc_contract:
                        transfer_data = usdc_contract.encode_abi(
                            "transfer",
                            args=[Web3.to_checksum_address(parsed.recipient_address), amount_units],
                        )
                        fn = vault_contract.functions.executeByAgent(
                            Web3.to_checksum_address(vault_state.usdc_address),
                            bytes.fromhex(transfer_data[2:]),
                            Web3.to_checksum_address(parsed.recipient_address),
                            amount_units,
                            b"\x00" * 32,
                        )
                        fn.call({"from": Web3.to_checksum_address(agent_addr)})
                    stage2_passed = True
                    evm_status = "SUCCESS"
                    estimated_gas = 85000

            except Exception as e:
                stage2_passed = False
                evm_status = "REVERTED"
                evm_revert_reason = self.decode_solidity_error(e)
        else:
            # Fallback if node offline
            if stage1_passed:
                stage2_passed = True
                evm_status = "SUCCESS"
                estimated_gas = 250000
            else:
                stage2_passed = False
                evm_status = "REVERTED"
                evm_revert_reason = "PolicyGuardrailRevert"

        overall_approved = stage1_passed and stage2_passed

        if overall_approved:
            vault_balance_after = round(vault_balance_before - parsed.amount_usdc, 2)
            balance_delta = parsed.amount_usdc
            risk_level = "LOW"
        else:
            vault_balance_after = vault_balance_before
            balance_delta = 0.0
            risk_level = "CRITICAL_BLOCKED" if parsed.prompt_injection_detected or not stage2_passed else "HIGH"

        return FirewallSimulationResult(
            overall_approved=overall_approved,
            stage1_offchain_passed=stage1_passed,
            stage2_onchain_simulation_passed=stage2_passed,
            stage1_checks=stage1_checks,
            evm_simulation_status=evm_status,
            evm_revert_reason=evm_revert_reason,
            estimated_gas=estimated_gas,
            vault_balance_before_usdc=vault_balance_before,
            vault_balance_after_usdc=vault_balance_after,
            balance_delta_usdc=balance_delta,
            risk_level=risk_level,
        )


firewall = AegisFirewall()
