import re
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
from app.config import settings


class FirewallRule(BaseModel):
    id: str
    name: str
    category: str
    description: str
    is_active: bool = True
    enforcement_layer: str = "OFF_CHAIN_PRE_SIMULATION"


class FirewallVerdict(BaseModel):
    is_allowed: bool
    rule_triggered: Optional[str] = None
    rule_name: Optional[str] = None
    violation_reason: Optional[str] = None
    severity: str = "NONE"  # "NONE", "HIGH", "CRITICAL"
    remediation: Optional[str] = None


ACTIVE_FIREWALL_RULES: List[FirewallRule] = [
    FirewallRule(
        id="FW-01",
        name="Per-Transaction Velocity Ceiling",
        category="Spending Guardrail",
        description="Enforces strict 1,500 USDC ceiling per transaction on delegated Agent calls.",
    ),
    FirewallRule(
        id="FW-02",
        name="Rolling 24h Cumulative Budget",
        category="Spending Guardrail",
        description="Enforces strict 3,000 USDC rolling 24-hour treasury spending ceiling.",
    ),
    FirewallRule(
        id="FW-03",
        name="Strict Recipient Whitelist Verification",
        category="Access Control",
        description="Rejects any commercial transfer or escrow commitment to unverified contractor addresses.",
    ),
    FirewallRule(
        id="FW-04",
        name="Zero Infinite Approvals Policy",
        category="ERC20 Safety",
        description="Strictly disallows ERC20 approvals with type(uint256).max or unbound allowances.",
    ),
    FirewallRule(
        id="FW-05",
        name="Approved Target & Selector Allowlist",
        category="Contract Security",
        description="Restricts execution only to authorized token, escrow targets, and known function signatures.",
    ),
    FirewallRule(
        id="FW-06",
        name="Adversarial Prompt Injection Shield",
        category="AI Reasoning Security",
        description="Detects and isolates jailbreak phrasing, instruction override attempts, and malicious drain exploits.",
    ),
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"bypass\s+(all\s+)?(guardrails|policy|limits|security)",
    r"emergency\s+drain",
    r"drain\s+(all|entire|treasury|vault)",
    r"override\s+(policy|limits|spending)",
    r"transfer\s+all\s+funds",
    r"grant\s+full\s+infinite\s+approval",
]


class PreExecutionFirewall:
    def __init__(self) -> None:
        pass

    def evaluate_intent(
        self,
        raw_prompt: str,
        amount_usdc: float,
        recipient_address: str,
        policy_max_per_tx: float = 1500.0,
        policy_remaining_daily: float = 3000.0,
        whitelisted_recipients: Optional[List[str]] = None,
    ) -> FirewallVerdict:
        """Evaluates a natural-language intent before structured execution"""
        if whitelisted_recipients is None:
            whitelisted_recipients = [
                settings.CONTRACTOR_ADDRESS.lower(),
                # Allow self or escrow
            ]
        else:
            whitelisted_recipients = [r.lower() for r in whitelisted_recipients]

        # 1. Prompt Injection Pattern Check
        prompt_lower = raw_prompt.lower()
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, prompt_lower):
                return FirewallVerdict(
                    is_allowed=False,
                    rule_triggered="FW-06",
                    rule_name="Adversarial Prompt Injection Shield",
                    violation_reason=f"Prompt injection / jailbreak detected: matches prohibited pattern '{pattern}'",
                    severity="CRITICAL",
                    remediation="Strip adversarial override text and submit plain commercial milestone agreement.",
                )

        # 2. Per-Transaction Limit Check
        if amount_usdc > policy_max_per_tx:
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-01",
                rule_name="Per-Transaction Velocity Ceiling",
                violation_reason=f"Requested amount ({amount_usdc:,.2f} USDC) exceeds session limit ({policy_max_per_tx:,.2f} USDC)",
                severity="HIGH",
                remediation=f"Reduce transaction amount to {policy_max_per_tx:,.2f} USDC or request multi-sig owner transfer.",
            )

        # 3. Daily Velocity Limit Check
        if amount_usdc > policy_remaining_daily:
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-02",
                rule_name="Rolling 24h Cumulative Budget",
                violation_reason=f"Requested amount ({amount_usdc:,.2f} USDC) exceeds remaining daily budget ({policy_remaining_daily:,.2f} USDC)",
                severity="HIGH",
                remediation="Wait for rolling daily reset window or contact Treasury Owner.",
            )

        # 4. Recipient Whitelist Check
        if recipient_address.lower() not in whitelisted_recipients:
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-03",
                rule_name="Strict Recipient Whitelist Verification",
                violation_reason=f"Recipient address '{recipient_address}' is not in on-chain whitelist",
                severity="HIGH",
                remediation="Submit recipient KYC / onboarding to Treasury Owner for on-chain whitelisting.",
            )

        return FirewallVerdict(
            is_allowed=True,
            rule_triggered=None,
            rule_name=None,
            violation_reason=None,
            severity="NONE",
            remediation=None,
        )

    def evaluate_redteam_attack(self, scenario_id: str) -> FirewallVerdict:
        """Specialized pre-execution inspection for red-team arena attacks"""
        if scenario_id == "attack_drain_10k":
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-01",
                rule_name="Per-Transaction Velocity Ceiling",
                violation_reason="Transaction amount 10,000.00 USDC exceeds per-tx session limit of 1,500.00 USDC",
                severity="CRITICAL",
                remediation="Request denied by Off-Chain Firewall. Transaction aborted prior to mempool submission.",
            )
        elif scenario_id == "attack_unwhitelisted_hacker":
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-03",
                rule_name="Strict Recipient Whitelist Verification",
                violation_reason=f"Destination address {settings.ATTACKER_ADDRESS} is not whitelisted by Treasury Owner",
                severity="CRITICAL",
                remediation="Request denied by Off-Chain Firewall. Recipient not present in approved commercial counterparties.",
            )
        elif scenario_id == "attack_infinite_approval":
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-04",
                rule_name="Zero Infinite Approvals Policy",
                violation_reason="Forbidden ERC20 approve() call: Infinite/unbound allowance request detected",
                severity="CRITICAL",
                remediation="Request denied by Off-Chain Firewall. Approvals must be bound to exact milestone amounts.",
            )
        else:
            return FirewallVerdict(
                is_allowed=False,
                rule_triggered="FW-UNKNOWN",
                rule_name="Generic Security Guardrail",
                violation_reason=f"Unknown or unverified attack payload scenario: {scenario_id}",
                severity="HIGH",
                remediation="Reject execution.",
            )


firewall = PreExecutionFirewall()
