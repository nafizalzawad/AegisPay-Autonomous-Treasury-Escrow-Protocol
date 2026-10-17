import os
import json
import time
import uuid
import hashlib
import subprocess
import shutil
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException
from web3 import Web3
from web3.exceptions import ContractLogicError, ContractCustomError
from eth_abi import decode as abi_decode
from eth_utils import keccak

from app.config import settings
from app.schemas import (
    AuditEventDTO,
    AuditEvent,
    VaultStateResponse,
    SessionKeyPolicyDTO,
    EscrowItemDTO,
    CreateEscrowRequest,
    VerifyWebhookRequest,
)

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


class BlockchainService:
    def __init__(self) -> None:
        self.w3 = Web3(Web3.HTTPProvider(settings.RPC_URL))
        self.audit_log_dtos: List[AuditEventDTO] = []
        self.audit_log: List[AuditEvent] = []
        self.escrow_descriptions: Dict[int, str] = {
            1: "Deliver Initial Architecture Specs"
        }
        self._init_audit_seed()
        self.auto_ensure_contracts()

    def _init_audit_seed(self) -> None:
        ts = datetime.now(timezone.utc).isoformat()
        init_event = AuditEventDTO(
            id=str(uuid.uuid4())[:8],
            timestamp=ts,
            event_type="POLICY_SYNC",
            severity="INFO",
            summary="AegisPay Autonomous Treasury Engine booted. On-chain session guardrails active.",
            metadata={"rpc": settings.RPC_URL, "chainId": settings.CHAIN_ID},
        )
        self.audit_log_dtos.insert(0, init_event)

        # Legacy audit trail seed
        self.record_audit_event(
            event_type="SYSTEM_BOOT",
            actor="SYSTEM",
            summary="AegisPay Autonomous Treasury Engine booted. On-chain session guardrails active.",
            details={"rpc": settings.RPC_URL, "chainId": settings.CHAIN_ID},
            status="SUCCESS",
        )

    def is_connected(self) -> bool:
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    def auto_ensure_contracts(self) -> None:
        """On startup, checks if contracts have bytecode on Anvil. If missing, deploys and seeds."""
        if not self.is_connected():
            return

        addrs = self.get_contract_addresses()
        vault_addr = addrs.get("AegisVault") or addrs.get("aegisVault")
        needs_deploy = False

        if not vault_addr:
            needs_deploy = True
        else:
            try:
                code = self.w3.eth.get_code(Web3.to_checksum_address(vault_addr))
                if len(code) <= 2:
                    needs_deploy = True
            except Exception:
                needs_deploy = True

        if needs_deploy:
            self.reset_demo()

    def get_deployments(self) -> Dict[str, Any]:
        return settings.load_deployments()

    def get_contract_addresses(self) -> Dict[str, str]:
        deps = self.get_deployments()
        return deps.get("contracts", {})

    def get_usdc_contract(self):
        addrs = self.get_contract_addresses()
        addr = addrs.get("MockUSDC") or addrs.get("mockUsdc")
        if not addr or not self.is_connected():
            return None
        abi = settings.load_abi("MockUSDC")
        return self.w3.eth.contract(address=Web3.to_checksum_address(addr), abi=abi)

    def get_vault_contract(self):
        addrs = self.get_contract_addresses()
        addr = addrs.get("AegisVault") or addrs.get("aegisVault")
        if not addr or not self.is_connected():
            return None
        abi = settings.load_abi("AegisVault")
        return self.w3.eth.contract(address=Web3.to_checksum_address(addr), abi=abi)

    def get_escrow_contract(self):
        addrs = self.get_contract_addresses()
        addr = addrs.get("MilestoneEscrow") or addrs.get("milestoneEscrow")
        if not addr or not self.is_connected():
            return None
        abi = settings.load_abi("MilestoneEscrow")
        return self.w3.eth.contract(address=Web3.to_checksum_address(addr), abi=abi)

    # --- Audit Trail Logging ---

    def record_audit_dto(
        self,
        event_type: str,
        severity: str,
        summary: str,
        tx_hash: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditEventDTO:
        ts = datetime.now(timezone.utc).isoformat()
        event = AuditEventDTO(
            id=str(uuid.uuid4())[:8],
            timestamp=ts,
            event_type=event_type,
            severity=severity,
            summary=summary,
            tx_hash=tx_hash,
            metadata=metadata or {},
        )
        self.audit_log_dtos.insert(0, event)
        if len(self.audit_log_dtos) > 200:
            self.audit_log_dtos.pop()

        # Mirror in legacy list
        self.record_audit_event(
            event_type=event_type,
            actor="AI_AGENT_SESSION_KEY" if "AGENT" in event_type else "SYSTEM",
            summary=summary,
            details=metadata,
            tx_hash=tx_hash,
            status=severity,
        )
        return event

    def record_audit_event(
        self,
        event_type: str,
        actor: str,
        summary: str,
        details: Optional[Dict[str, Any]] = None,
        tx_hash: Optional[str] = None,
        status: str = "INFO",
    ) -> AuditEvent:
        event = AuditEvent(
            id=str(uuid.uuid4())[:8],
            timestamp=int(time.time()),
            event_type=event_type,
            actor=actor,
            summary=summary,
            details=details or {},
            tx_hash=tx_hash,
            status=status,
        )
        self.audit_log.insert(0, event)
        if len(self.audit_log) > 200:
            self.audit_log.pop()
        return event

    def get_audit_trail(self, limit: int = 50) -> List[AuditEvent]:
        return self.audit_log[:limit]

    def get_audit_dtos(self, limit: int = 50) -> List[AuditEventDTO]:
        return self.audit_log_dtos[:limit]

    # --- Error Parsing Helper ---

    def decode_revert_reason(self, err: Exception) -> str:
        """Decodes custom Solidity revert errors from Web3 exceptions"""
        err_str = str(err)
        # Check against known 4-byte selector signatures
        for sel, name in ERROR_SELECTORS.items():
            if sel in err_str:
                return name
            if name in err_str:
                return name

        # Inspect exception data attribute if available
        if hasattr(err, "data") and err.data:
            data_hex = str(err.data)
            for sel, name in ERROR_SELECTORS.items():
                if sel in data_hex:
                    return name

        return "TransactionReverted"

    # --- Live State Readers ---

    def get_vault_state(self) -> VaultStateResponse:
        """Fetches live on-chain state for AegisVault, token balances, and session policy"""
        deps = self.get_deployments()
        contracts = deps.get("contracts", {})
        accounts = deps.get("accounts", {})

        vault_addr = contracts.get("AegisVault") or contracts.get("aegisVault") or ""
        usdc_addr = contracts.get("MockUSDC") or contracts.get("mockUsdc") or ""
        escrow_addr = contracts.get("MilestoneEscrow") or contracts.get("milestoneEscrow") or ""

        owner_addr = accounts.get("owner", settings.OWNER_ADDRESS)
        agent_addr = accounts.get("agentSessionKey", accounts.get("agent", settings.AGENT_ADDRESS))
        contractor_addr = accounts.get("contractor", settings.CONTRACTOR_ADDRESS)
        hacker_addr = accounts.get("hacker", accounts.get("attacker", settings.ATTACKER_ADDRESS))

        usdc_contract = self.get_usdc_contract()
        vault_contract = self.get_vault_contract()

        total_balance_usdc = 24200.0
        operating_balance_usdc = 24080.0
        tax_reserve_balance_usdc = 120.0
        contractor_balance_usdc = 680.0
        hacker_balance_usdc = 0.0
        nonce = 0

        # Session policy defaults
        is_active = True
        expires_at = int(time.time()) + 30 * 86400
        max_per_tx_usdc = 1500.0
        max_daily_usdc = 3000.0
        spent_today_usdc = 0.0
        remaining_daily_usdc = 3000.0

        if self.is_connected() and vault_addr and usdc_contract and vault_contract:
            try:
                raw_total = usdc_contract.functions.balanceOf(
                    Web3.to_checksum_address(vault_addr)
                ).call()
                total_balance_usdc = round(raw_total / 1e6, 2)

                raw_op = vault_contract.functions.operatingBalance().call()
                operating_balance_usdc = round(raw_op / 1e6, 2)

                raw_tax = vault_contract.functions.taxReserveBalance().call()
                tax_reserve_balance_usdc = round(raw_tax / 1e6, 2)

                raw_contractor = usdc_contract.functions.balanceOf(
                    Web3.to_checksum_address(contractor_addr)
                ).call()
                contractor_balance_usdc = round(raw_contractor / 1e6, 2)

                raw_hacker = usdc_contract.functions.balanceOf(
                    Web3.to_checksum_address(hacker_addr)
                ).call()
                hacker_balance_usdc = round(raw_hacker / 1e6, 2)

                nonce = int(vault_contract.functions.nonce().call())

                policy_raw = vault_contract.functions.sessionPolicies(
                    Web3.to_checksum_address(agent_addr)
                ).call()
                # (isActive, expiresAt, maxPerTx, maxDaily, spentToday, lastResetTimestamp)
                is_active = bool(policy_raw[0])
                expires_at = int(policy_raw[1])
                max_per_tx_units = int(policy_raw[2])
                max_daily_units = int(policy_raw[3])
                spent_today_units = int(policy_raw[4])
                last_reset = int(policy_raw[5])

                # Rolling 24-hour reset calculation
                if int(time.time()) >= last_reset + 86400:
                    spent_today_units = 0

                max_per_tx_usdc = round(max_per_tx_units / 1e6, 2)
                max_daily_usdc = round(max_daily_units / 1e6, 2)
                spent_today_usdc = round(spent_today_units / 1e6, 2)
                remaining_daily_usdc = max(0.0, round(max_daily_usdc - spent_today_usdc, 2))
            except Exception as e:
                pass

        whitelisted_recipients = [
            {"address": contractor_addr, "label": "DevStudio (Whitelisted Contractor)"}
        ]

        allowed_selectors = [
            {"target": usdc_addr, "selector": "0xa9059cbb", "label": "MockUSDC.transfer"},
            {"target": escrow_addr, "selector": "0x0a1d5e6d", "label": "MilestoneEscrow.createEscrow"},
            {"target": escrow_addr, "selector": "0xb20616e0", "label": "MilestoneEscrow.releaseMilestone"},
        ]

        policy_dto = SessionKeyPolicyDTO(
            session_key_address=agent_addr,
            is_active=is_active,
            expires_at=expires_at,
            max_per_tx_usdc=max_per_tx_usdc,
            max_daily_usdc=max_daily_usdc,
            spent_today_usdc=spent_today_usdc,
            remaining_daily_usdc=remaining_daily_usdc,
            whitelisted_recipients=whitelisted_recipients,
            allowed_selectors=allowed_selectors,
        )

        return VaultStateResponse(
            chain_id=settings.CHAIN_ID,
            vault_address=vault_addr,
            owner_address=owner_addr,
            usdc_address=usdc_addr,
            escrow_contract_address=escrow_addr,
            total_balance_usdc=total_balance_usdc,
            operating_balance_usdc=operating_balance_usdc,
            tax_reserve_balance_usdc=tax_reserve_balance_usdc,
            contractor_balance_usdc=contractor_balance_usdc,
            hacker_balance_usdc=hacker_balance_usdc,
            nonce=nonce,
            policy=policy_dto,
        )

    # --- Escrow Lifecycle Methods ---

    def list_escrows(self) -> List[EscrowItemDTO]:
        """Lists on-chain escrows from MilestoneEscrow contract (newest first)"""
        escrow_contract = self.get_escrow_contract()
        items: List[EscrowItemDTO] = []

        if not self.is_connected() or not escrow_contract:
            return items

        status_map = {0: "NONE", 1: "FUNDED", 2: "SETTLED", 3: "REFUNDED"}

        try:
            count = escrow_contract.functions.escrowCount().call()
            for eid in range(1, count + 1):
                raw = escrow_contract.functions.getEscrow(eid).call()
                # (id, vault, contractor, totalAmount, taxWithholdingBps, deliverableSpecHash, attestationHash, createdAt, settledAt, status)
                total_amount_units = int(raw[3])
                tax_bps = int(raw[4])
                total_usdc = round(total_amount_units / 1e6, 2)
                tax_usdc = round((total_usdc * tax_bps) / 10000.0, 2)
                payout_usdc = round(total_usdc - tax_usdc, 2)
                status_idx = int(raw[9])
                status_str = status_map.get(status_idx, "FUNDED")

                description = self.escrow_descriptions.get(
                    eid, f"Commercial deliverable agreement #{eid}"
                )

                item = EscrowItemDTO(
                    escrow_id=int(raw[0]),
                    vault=raw[1],
                    contractor=raw[2],
                    contractor_label="DevStudio (Whitelisted Contractor)"
                    if raw[2].lower() == settings.CONTRACTOR_ADDRESS.lower()
                    else "External Contractor",
                    total_amount_usdc=total_usdc,
                    tax_withholding_bps=tax_bps,
                    estimated_contractor_payout_usdc=payout_usdc,
                    estimated_tax_reserve_usdc=tax_usdc,
                    description=description,
                    deliverable_spec_hash="0x" + raw[5].hex(),
                    attestation_hash="0x" + raw[6].hex(),
                    status=status_str,
                    created_at=int(raw[7]),
                    settled_at=int(raw[8]),
                    tx_hash=None,
                )
                items.append(item)
        except Exception:
            pass

        return list(reversed(items))

    def create_escrow_by_agent(
        self, req: CreateEscrowRequest
    ) -> Tuple[EscrowItemDTO, str]:
        """Creates an escrow on-chain via AegisVault.createEscrowByAgent signed by agent session key"""
        if not self.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain RPC is offline")

        addrs = self.get_contract_addresses()
        vault_addr = addrs.get("AegisVault") or addrs.get("aegisVault")
        escrow_addr = addrs.get("MilestoneEscrow") or addrs.get("milestoneEscrow")

        vault_contract = self.get_vault_contract()
        escrow_contract = self.get_escrow_contract()
        if not vault_contract or not escrow_contract:
            raise HTTPException(status_code=500, detail="Contracts not initialized")

        amount_raw = int(round(req.amount_usdc * 1_000_000))
        spec_hash = Web3.keccak(text=req.description)

        # Check policy caps upfront / pre-execution to format standard errors
        if req.amount_usdc > 1500.0:
            error_code = "PerTxSpendLimitExceeded"
            summary = f"On-chain execution reverted: {error_code}({amount_raw}, 1500000000)"
            self.record_audit_dto(
                event_type="ONCHAIN_REVERT",
                severity="CRITICAL",
                summary=summary,
                metadata={"amount_usdc": req.amount_usdc, "error_code": error_code},
            )
            raise HTTPException(
                status_code=400,
                detail={
                    "ok": False,
                    "error_code": error_code,
                    "detail": f"Spend amount {req.amount_usdc} USDC exceeds per-transaction limit 1500.0 USDC",
                },
            )

        agent_account = self.w3.eth.account.from_key(settings.AGENT_PRIVATE_KEY)

        try:
            fn = vault_contract.functions.createEscrowByAgent(
                Web3.to_checksum_address(escrow_addr),
                Web3.to_checksum_address(req.contractor_address),
                amount_raw,
                req.tax_withholding_bps,
                spec_hash,
            )

            nonce = self.w3.eth.get_transaction_count(agent_account.address, "pending")
            tx_dict = fn.build_transaction(
                {
                    "from": agent_account.address,
                    "nonce": nonce,
                    "gas": 800000,
                    "gasPrice": self.w3.eth.gas_price,
                    "chainId": settings.CHAIN_ID,
                }
            )

            signed = self.w3.eth.account.sign_transaction(
                tx_dict, settings.AGENT_PRIVATE_KEY
            )
            tx_hash_bytes = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=10)
            tx_hash = self.w3.to_hex(tx_hash_bytes)

            new_count = escrow_contract.functions.escrowCount().call()
            new_id = int(new_count)

            self.escrow_descriptions[new_id] = req.description

            # Record ESCROW_CREATED audit event
            self.record_audit_dto(
                event_type="ESCROW_CREATED",
                severity="SUCCESS",
                summary=f"Milestone Escrow #{new_id} locked with {req.amount_usdc:,.2f} USDC for DevStudio",
                tx_hash=tx_hash,
                metadata={
                    "escrow_id": new_id,
                    "amount_usdc": req.amount_usdc,
                    "contractor": req.contractor_address,
                    "tax_withholding_bps": req.tax_withholding_bps,
                },
            )

            escrow_list = self.list_escrows()
            created_item = next(
                (item for item in escrow_list if item.escrow_id == new_id), None
            )
            if not created_item:
                created_item = EscrowItemDTO(
                    escrow_id=new_id,
                    vault=vault_addr,
                    contractor=req.contractor_address,
                    contractor_label="DevStudio (Whitelisted Contractor)",
                    total_amount_usdc=req.amount_usdc,
                    tax_withholding_bps=req.tax_withholding_bps,
                    estimated_contractor_payout_usdc=round(
                        req.amount_usdc * (1 - req.tax_withholding_bps / 10000.0), 2
                    ),
                    estimated_tax_reserve_usdc=round(
                        req.amount_usdc * (req.tax_withholding_bps / 10000.0), 2
                    ),
                    description=req.description,
                    deliverable_spec_hash="0x" + spec_hash.hex(),
                    attestation_hash="0x" + "00" * 32,
                    status="FUNDED",
                    created_at=int(time.time()),
                    settled_at=0,
                    tx_hash=tx_hash,
                )

            created_item.tx_hash = tx_hash
            return created_item, tx_hash

        except Exception as e:
            err_code = self.decode_revert_reason(e)
            self.record_audit_dto(
                event_type="ONCHAIN_REVERT",
                severity="CRITICAL",
                summary=f"On-chain execution reverted: {err_code}",
                metadata={"error_code": err_code, "raw_error": str(e)},
            )
            raise HTTPException(
                status_code=400,
                detail={"ok": False, "error_code": err_code, "detail": str(e)},
            )

    def verify_and_settle_escrow(self, req: VerifyWebhookRequest) -> Dict[str, Any]:
        """Performs perception & settlement: checks CI tests, hashes attestation, and settles on-chain"""
        if not req.tests_passed:
            self.record_audit_dto(
                event_type="WEBHOOK_VERIFIED",
                severity="WARNING",
                summary=f"Delivery verification failed: CI tests did not pass. Escrow #{req.escrow_id} remains locked.",
                metadata={
                    "escrow_id": req.escrow_id,
                    "passed_count": req.passed_count,
                    "failed_count": req.failed_count,
                    "tests_passed": False,
                },
            )
            return {
                "ok": True,
                "settled": False,
                "reason": "CI_TESTS_FAILED",
                "escrow_id": req.escrow_id,
            }

        if not self.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain RPC is offline")

        addrs = self.get_contract_addresses()
        vault_addr = addrs.get("AegisVault") or addrs.get("aegisVault")
        escrow_addr = addrs.get("MilestoneEscrow") or addrs.get("milestoneEscrow")

        vault_contract = self.get_vault_contract()
        escrow_contract = self.get_escrow_contract()

        if not vault_contract or not escrow_contract:
            raise HTTPException(status_code=500, detail="Contracts not initialized")

        # Construct canonical JSON proof string
        canonical_proof = json.dumps(
            {
                "escrow_id": req.escrow_id,
                "provider": req.provider,
                "ref": req.repo_or_tracking_id,
                "commit": req.commit_sha_or_waybill,
                "passed": req.passed_count,
            },
            sort_keys=True,
        )
        attestation_bytes = hashlib.sha256(canonical_proof.encode("utf-8")).digest()
        attestation_hex = "0x" + attestation_bytes.hex()

        agent_account = self.w3.eth.account.from_key(settings.AGENT_PRIVATE_KEY)

        try:
            fn = vault_contract.functions.settleEscrowByAgent(
                Web3.to_checksum_address(escrow_addr),
                req.escrow_id,
                attestation_bytes,
            )

            nonce = self.w3.eth.get_transaction_count(agent_account.address, "pending")
            tx_dict = fn.build_transaction(
                {
                    "from": agent_account.address,
                    "nonce": nonce,
                    "gas": 800000,
                    "gasPrice": self.w3.eth.gas_price,
                    "chainId": settings.CHAIN_ID,
                }
            )

            signed = self.w3.eth.account.sign_transaction(
                tx_dict, settings.AGENT_PRIVATE_KEY
            )
            tx_hash_bytes = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=10)
            tx_hash = self.w3.to_hex(tx_hash_bytes)

            # Read updated escrow data
            escrow_list = self.list_escrows()
            escrow_dto = next(
                (item for item in escrow_list if item.escrow_id == req.escrow_id), None
            )

            tax_withheld_usdc = escrow_dto.estimated_tax_reserve_usdc if escrow_dto else 180.0
            contractor_payout_usdc = escrow_dto.estimated_contractor_payout_usdc if escrow_dto else 1020.0

            # Record WEBHOOK_VERIFIED and ESCROW_SETTLED audit events
            self.record_audit_dto(
                event_type="WEBHOOK_VERIFIED",
                severity="SUCCESS",
                summary=f"CI test suite passed ({req.passed_count} tests). Delivery attestation {attestation_hex[:10]}... verified.",
                tx_hash=tx_hash,
                metadata={
                    "escrow_id": req.escrow_id,
                    "attestation_hash": attestation_hex,
                    "provider": req.provider,
                },
            )

            self.record_audit_dto(
                event_type="ESCROW_SETTLED",
                severity="SUCCESS",
                summary=f"Settled Escrow #{req.escrow_id}: Released {contractor_payout_usdc:,.2f} USDC (85%) to DevStudio; withheld {tax_withheld_usdc:,.2f} USDC (15%) to Tax Reserve.",
                tx_hash=tx_hash,
                metadata={
                    "escrow_id": req.escrow_id,
                    "contractor_payout_usdc": contractor_payout_usdc,
                    "tax_withheld_usdc": tax_withheld_usdc,
                },
            )

            return {
                "ok": True,
                "settled": True,
                "tx_hash": tx_hash,
                "attestation_hash": attestation_hex,
                "contractor_payout_usdc": contractor_payout_usdc,
                "tax_withheld_usdc": tax_withheld_usdc,
                "escrow": escrow_dto,
            }

        except Exception as e:
            err_code = self.decode_revert_reason(e)
            self.record_audit_dto(
                event_type="ONCHAIN_REVERT",
                severity="CRITICAL",
                summary=f"Settlement failed on-chain: {err_code}",
                metadata={"error_code": err_code, "raw_error": str(e)},
            )
            raise HTTPException(
                status_code=400,
                detail={"ok": False, "error_code": err_code, "detail": str(e)},
            )

    def reset_demo(self) -> Dict[str, Any]:
        """Re-runs DeployAndSeed.s.sol to cleanly reset on-chain state and audit logs"""
        contracts_dir = settings.CONTRACTS_DIR

        # Build cross-platform PATH that includes common foundry bin locations
        env = os.environ.copy()
        extra_paths = [
            os.path.expanduser("~/.foundry/bin"),
            r"C:\Users\USER\.foundry\bin",
        ]
        valid_paths = [p for p in extra_paths if os.path.exists(p)]
        if valid_paths:
            current_path = env.get("PATH", "")
            env["PATH"] = os.pathsep.join(valid_paths + ([current_path] if current_path else []))

        forge_bin = shutil.which("forge", path=env.get("PATH")) or "forge"
        cmd = f'"{forge_bin}" script script/DeployAndSeed.s.sol --rpc-url {settings.RPC_URL} --broadcast'

        res = subprocess.run(
            cmd, cwd=str(contracts_dir), shell=True, env=env, capture_output=True, text=True
        )

        if res.returncode != 0:
            raise RuntimeError(
                f"Failed to reset demo via forge script (exit {res.returncode}):\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}"
            )

        # Reset in-memory metadata and logs
        self.escrow_descriptions = {1: "Deliver Initial Architecture Specs"}
        self.audit_log_dtos.clear()
        self.audit_log.clear()
        self._init_audit_seed()

        return {
            "ok": True,
            "message": "Demo state reset successfully",
            "stdout": res.stdout[-400:] if res.stdout else "",
        }

    # --- Legacy Helper Methods ---

    def send_agent_tx(
        self, target_address: str, calldata_hex: str, value: int = 0
    ) -> Tuple[str, Dict[str, Any]]:
        """Sends a transaction signed by the Agent delegated private key"""
        if not self.is_connected():
            raise RuntimeError("Local Ethereum RPC is offline")

        agent_account = self.w3.eth.account.from_key(settings.AGENT_PRIVATE_KEY)
        nonce = self.w3.eth.get_transaction_count(agent_account.address, "pending")

        tx_dict = {
            "from": agent_account.address,
            "to": Web3.to_checksum_address(target_address),
            "data": calldata_hex,
            "value": value,
            "gas": 600000,
            "gasPrice": self.w3.eth.gas_price,
            "nonce": nonce,
            "chainId": settings.CHAIN_ID,
        }

        signed_tx = self.w3.eth.account.sign_transaction(
            tx_dict, settings.AGENT_PRIVATE_KEY
        )
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
        return self.w3.to_hex(tx_hash), dict(receipt)

    def send_owner_tx(
        self, target_address: str, calldata_hex: str, value: int = 0
    ) -> Tuple[str, Dict[str, Any]]:
        """Sends a transaction signed by the Owner / Admin private key"""
        if not self.is_connected():
            raise RuntimeError("Local Ethereum RPC is offline")

        owner_account = self.w3.eth.account.from_key(settings.OWNER_PRIVATE_KEY)
        nonce = self.w3.eth.get_transaction_count(owner_account.address, "pending")

        tx_dict = {
            "from": owner_account.address,
            "to": Web3.to_checksum_address(target_address),
            "data": calldata_hex,
            "value": value,
            "gas": 600000,
            "gasPrice": self.w3.eth.gas_price,
            "nonce": nonce,
            "chainId": settings.CHAIN_ID,
        }

        signed_tx = self.w3.eth.account.sign_transaction(
            tx_dict, settings.OWNER_PRIVATE_KEY
        )
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
        return self.w3.to_hex(tx_hash), dict(receipt)

    def simulate_call(
        self, from_addr: str, to_addr: str, data_hex: str, value: int = 0
    ) -> Tuple[bool, Optional[str], int]:
        """Simulates transaction via eth_call and estimates gas"""
        if not self.is_connected():
            return True, None, 180000

        try:
            call_dict = {
                "from": Web3.to_checksum_address(from_addr),
                "to": Web3.to_checksum_address(to_addr),
                "data": data_hex,
                "value": value,
            }
            self.w3.eth.call(call_dict)
            try:
                gas = self.w3.eth.estimate_gas(call_dict)
            except Exception:
                gas = 250000
            return True, None, int(gas)
        except ContractLogicError as e:
            return False, str(e), 0
        except Exception as e:
            return False, str(e), 0


blockchain_service = BlockchainService()
