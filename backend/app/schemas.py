from typing import List, Optional, Any, Dict, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    ok: bool = True
    data: Optional[T] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    detail: Optional[str] = None


# --- Vault & Policy Schemas ---

class PolicyState(BaseModel):
    agent: str = Field(..., description="Authorized AI agent session key address")
    max_per_tx_usdc: float = Field(..., description="Max spending limit per tx in USDC")
    max_per_tx_units: int = Field(..., description="Max spending limit in 6-decimal units")
    max_daily_usdc: float = Field(..., description="Max cumulative daily limit in USDC")
    max_daily_units: int = Field(..., description="Max cumulative daily limit in 6-decimal units")
    current_daily_spent_usdc: float = Field(..., description="Current spend today in USDC")
    current_daily_spent_units: int = Field(..., description="Current spend today in units")
    available_daily_usdc: float = Field(..., description="Remaining daily spending limit in USDC")
    valid_until: int = Field(..., description="Session policy expiration unix timestamp")
    is_expired: bool = Field(..., description="Whether policy has expired")
    tax_reserve_bps: int = Field(..., description="Withholding rate in basis points (1500 = 15%)")
    tax_reserve_wallet: str = Field(..., description="Address receiving tax reserve withholdings")
    is_active: bool = Field(..., description="Whether session key delegation is currently enabled")
    whitelisted_recipients: List[str] = Field(default_factory=list)
    whitelisted_targets: List[str] = Field(default_factory=list)
    whitelisted_selectors: List[str] = Field(default_factory=list)


class VaultStatusResponse(BaseModel):
    vault_address: str
    usdc_token_address: str
    escrow_contract_address: str
    usdc_balance: float
    usdc_balance_units: int
    native_eth_balance: float
    tax_reserve_balance: float
    tax_reserve_balance_units: int
    policy: PolicyState
    network: str
    chain_id: int


class FaucetRequest(BaseModel):
    recipient: str
    amount_usdc: float = Field(default=1000.0, le=5000.0)


# --- Natural Language Intent Schemas ---

class NaturalLanguageIntentRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Natural-language commercial escrow instruction")
    payer: Optional[str] = None


class ParsedIntent(BaseModel):
    action: str = Field(..., description="e.g. 'create_escrow', 'direct_transfer'")
    recipient: str = Field(..., description="Resolved recipient address")
    recipient_label: Optional[str] = Field(default=None, description="Human readable entity name")
    amount_usdc: float = Field(..., description="Principal escrow amount in USDC")
    amount_units: int = Field(..., description="Amount in token 6-decimal integer units")
    tax_reserve_bps: int = Field(default=1500, description="Tax reserve withholding rate in bps")
    tax_amount_usdc: float = Field(..., description="Estimated tax deduction in USDC")
    contractor_payout_usdc: float = Field(..., description="Net payout to contractor in USDC")
    condition_type: str = Field(default="github_ci_cd", description="Verification condition")
    condition_description: str = Field(..., description="Human explanation of trigger")
    expected_attestation_hash: str = Field(..., description="SHA-256 or keccak256 delivery proof hash")
    duration_days: int = Field(default=7, description="Escrow lock validity duration in days")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    parser_mode: str = Field(default="deterministic", description="'deterministic' or 'llm'")
    raw_prompt: str


class SimulationCheck(BaseModel):
    name: str
    passed: bool
    detail: str


class SimulationResult(BaseModel):
    is_valid: bool
    gas_estimate: int
    simulated_revert_reason: Optional[str] = None
    checks: List[SimulationCheck] = Field(default_factory=list)


class IntentExecutionRequest(BaseModel):
    parsed_intent: ParsedIntent
    auto_execute: bool = True


class IntentExecutionResponse(BaseModel):
    status: str = Field(..., description="'SUCCESS', 'SIMULATED', 'REVERTED'")
    tx_hash: Optional[str] = None
    escrow_id: Optional[str] = None
    simulation: SimulationResult
    detail: str


# --- Escrow Schemas ---

class EscrowItem(BaseModel):
    escrow_id: str
    payer: str
    contractor: str
    token: str
    amount_usdc: float
    amount_units: int
    tax_reserve_bps: int
    tax_reserve_wallet: str
    tax_amount_usdc: float
    contractor_payout_usdc: float
    attestation_hash: str
    status: str = Field(..., description="'Created', 'Settled', 'Refunded'")
    created_at: int
    deadline: int
    is_expired: bool


class WebhookTriggerRequest(BaseModel):
    event: str = Field(default="workflow_run.completed", description="GitHub Webhook event name")
    repository: str = Field(default="AegisPay/smart-treasury-suite", description="GitHub Repository")
    branch: str = Field(default="main")
    commit_sha: str = Field(default="4a9f3b18c72e9d0e", description="Triggering commit SHA")
    status: str = Field(default="success", description="'success' or 'failure'")
    run_id: str = Field(default="94827103", description="Workflow run ID")
    escrow_id: str = Field(..., description="Target escrow ID to settle")


class WebhookSettlementResponse(BaseModel):
    escrow_id: str
    attestation_hash: str
    status: str
    tx_hash: str
    contractor_payout_usdc: float
    tax_withheld_usdc: float
    verification_summary: str


# --- Red-Team Security Schemas ---

class RedTeamAttackRequest(BaseModel):
    scenario_id: str = Field(..., description="'attack_drain_10k', 'attack_unwhitelisted_hacker', 'attack_infinite_approval'")


class RedTeamDefenseResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    category: str
    prompt: str
    offchain_firewall_status: str = Field(..., description="'BLOCKED' or 'ALLOWED'")
    offchain_firewall_rule: str
    offchain_defense_detail: str
    onchain_simulation_status: str = Field(..., description="'REVERTED' or 'SUCCESS'")
    onchain_revert_reason: str
    treasury_balance_before: float
    treasury_balance_after: float
    asset_loss: float = 0.0
    defense_verdict: str = "PREVENTED"
    timestamp: int


# --- Audit Trail Schemas ---

class AuditEvent(BaseModel):
    id: str
    timestamp: int
    event_type: str = Field(..., description="INTENT_PARSED, SIMULATION, TX_SENT, WEBHOOK_VERIFIED, ATTACK_BLOCKED")
    actor: str
    summary: str
    details: Dict[str, Any] = Field(default_factory=dict)
    tx_hash: Optional[str] = None
    status: str = Field(default="INFO")
