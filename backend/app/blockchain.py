import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from web3 import Web3
from web3.exceptions import ContractLogicError
from eth_abi import decode as abi_decode
from eth_utils import keccak

from app.config import settings
from app.schemas import AuditEvent

# Standard ABIs
MOCK_USDC_ABI = [
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"},
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "faucet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

AEGIS_VAULT_ABI = [
    {
        "inputs": [],
        "name": "policy",
        "outputs": [
            {"name": "agent", "type": "address"},
            {"name": "maxPerTx", "type": "uint256"},
            {"name": "maxDaily", "type": "uint256"},
            {"name": "currentDailySpent", "type": "uint256"},
            {"name": "lastDailyReset", "type": "uint256"},
            {"name": "validUntil", "type": "uint256"},
            {"name": "taxReserveBps", "type": "uint16"},
            {"name": "taxReserveWallet", "type": "address"},
            {"name": "isActive", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "recipient", "type": "address"}],
        "name": "isRecipientWhitelisted",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "target", "type": "address"}],
        "name": "isTargetWhitelisted",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "selector", "type": "bytes4"}],
        "name": "isSelectorWhitelisted",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "taxReserveBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAvailableDailyLimit",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "target", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "data", "type": "bytes"},
        ],
        "name": "executeAsAgent",
        "outputs": [{"name": "", "type": "bytes"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "target", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "data", "type": "bytes"},
        ],
        "name": "executeAsOwner",
        "outputs": [{"name": "", "type": "bytes"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

MILESTONE_ESCROW_ABI = [
    {
        "inputs": [
            {"name": "contractor", "type": "address"},
            {"name": "token", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "taxReserveBps", "type": "uint16"},
            {"name": "taxReserveWallet", "type": "address"},
            {"name": "attestationHash", "type": "bytes32"},
            {"name": "duration", "type": "uint256"},
        ],
        "name": "createEscrow",
        "outputs": [{"name": "escrowId", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "escrowId", "type": "bytes32"},
            {"name": "deliveryAttestation", "type": "bytes32"},
        ],
        "name": "settleEscrow",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "escrowId", "type": "bytes32"}],
        "name": "refundEscrow",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "escrowId", "type": "bytes32"}],
        "name": "getEscrow",
        "outputs": [
            {
                "components": [
                    {"name": "escrowId", "type": "bytes32"},
                    {"name": "payer", "type": "address"},
                    {"name": "contractor", "type": "address"},
                    {"name": "token", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "taxReserveBps", "type": "uint16"},
                    {"name": "taxReserveWallet", "type": "address"},
                    {"name": "attestationHash", "type": "bytes32"},
                    {"name": "status", "type": "uint8"},
                    {"name": "createdAt", "type": "uint256"},
                    {"name": "deadline", "type": "uint256"},
                ],
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAllEscrowIds",
        "outputs": [{"name": "", "type": "bytes32[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getEscrowCount",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class BlockchainService:
    def __init__(self) -> None:
        self.w3 = Web3(Web3.HTTPProvider(settings.RPC_URL))
        self.audit_log: List[AuditEvent] = []
        self._init_audit_seed()

    def _init_audit_seed(self) -> None:
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

    def get_deployments(self) -> Dict[str, Any]:
        return settings.load_deployments()

    def get_contract_addresses(self) -> Dict[str, str]:
        deps = self.get_deployments()
        return deps.get("contracts", {})

    def get_usdc_contract(self):
        addrs = self.get_contract_addresses()
        addr = addrs.get("MockUSDC")
        if not addr or not self.is_connected():
            return None
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(addr), abi=MOCK_USDC_ABI
        )

    def get_vault_contract(self):
        addrs = self.get_contract_addresses()
        addr = addrs.get("AegisVault")
        if not addr or not self.is_connected():
            return None
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(addr), abi=AEGIS_VAULT_ABI
        )

    def get_escrow_contract(self):
        addrs = self.get_contract_addresses()
        addr = addrs.get("MilestoneEscrow")
        if not addr or not self.is_connected():
            return None
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(addr), abi=MILESTONE_ESCROW_ABI
        )

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
        # Cap at 200 events
        if len(self.audit_log) > 200:
            self.audit_log.pop()
        return event

    def get_audit_trail(self, limit: int = 50) -> List[AuditEvent]:
        return self.audit_log[:limit]

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
        return tx_hash.hex(), dict(receipt)

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
        return tx_hash.hex(), dict(receipt)

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
            err_msg = str(e)
            return False, err_msg, 0


blockchain_service = BlockchainService()
