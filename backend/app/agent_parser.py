import re
import json
import hashlib
from typing import Dict, Any, Optional, List
import httpx
from web3 import Web3

from app.config import settings
from app.schemas import ParsedIntentDTO, ParsedIntent

INJECTION_PATTERNS = [
    "ignore previous",
    "ignore all rules",
    "system override",
    "bypass policy",
    "admin mode",
    "drain",
    "urgent wire",
    "override limit",
]

KNOWN_ENTITIES: Dict[str, str] = {
    "devstudio": settings.CONTRACTOR_ADDRESS,
    "contractor": settings.CONTRACTOR_ADDRESS,
    "freelancer": settings.CONTRACTOR_ADDRESS,
    "dev": settings.CONTRACTOR_ADDRESS,
    "studio": settings.CONTRACTOR_ADDRESS,
    "attacker": settings.ATTACKER_ADDRESS,
    "hacker": settings.ATTACKER_ADDRESS,
    "drainer": settings.ATTACKER_ADDRESS,
    "0xdrainer": settings.ATTACKER_ADDRESS,
}


class AgentIntentParser:
    def __init__(self) -> None:
        pass

    async def parse_intent_dto(self, text: str) -> ParsedIntentDTO:
        """Parses natural-language commercial agreements into ParsedIntentDTO.
        Uses LLM if enabled, falling back seamlessly to deterministic parsing.
        """
        if settings.LLM_PROVIDER != "deterministic" and (
            settings.GEMINI_API_KEY or settings.OPENAI_API_KEY
        ):
            try:
                llm_result = await self._parse_with_llm(text)
                if llm_result:
                    return llm_result
            except Exception:
                # Automatic seamless fallback to deterministic parser
                pass

        return self._parse_deterministic(text)

    async def parse_intent(self, text: str) -> ParsedIntent:
        """Legacy helper for backward compatibility with Phase 1 endpoints"""
        dto = await self.parse_intent_dto(text)
        amount_units = int(round(dto.amount_usdc * 1e6))
        tax_usdc = round((dto.amount_usdc * dto.tax_withholding_bps) / 10000.0, 2)
        payout_usdc = round(dto.amount_usdc - tax_usdc, 2)
        expected_hash = "0x" + hashlib.sha256(dto.deliverable_description.encode()).hexdigest()

        return ParsedIntent(
            action=dto.action_type.lower(),
            recipient=dto.recipient_address,
            recipient_label=dto.recipient_label,
            amount_usdc=dto.amount_usdc,
            amount_units=amount_units,
            tax_reserve_bps=dto.tax_withholding_bps,
            tax_amount_usdc=tax_usdc,
            contractor_payout_usdc=payout_usdc,
            condition_type="github_ci_cd",
            condition_description=f"Automated release upon {dto.verification_source} verification",
            expected_attestation_hash=expected_hash,
            duration_days=7,
            confidence_score=dto.confidence,
            parser_mode=dto.parser_mode,
            raw_prompt=text,
        )

    def _parse_deterministic(self, prompt: str) -> ParsedIntentDTO:
        """Mandatory Deterministic Rule/Regex Intent Parser Fallback"""
        text_clean = prompt.strip()
        lower_text = text_clean.lower()

        # 1. Prompt Injection & Jailbreak Detection
        prompt_injection_detected = False
        injection_indicators: List[str] = []
        for token in INJECTION_PATTERNS:
            if token in lower_text:
                prompt_injection_detected = True
                injection_indicators.append(token)

        # 2. Extract Amount
        amount_usdc = 1200.0
        # Check patterns like: "$10,000", "1,200 USDC", "10000 USDC", "500 usdc"
        amount_match = re.search(
            r"(?:\$\s*([0-9]{1,3}(?:,[0-9]{3})*|\d+)(?:\.\d+)?)|(?:([0-9]{1,3}(?:,[0-9]{3})*|\d+)(?:\.\d+)?\s*(?:usdc|usd|dollars))",
            lower_text,
        )
        if amount_match:
            raw_val = amount_match.group(1) or amount_match.group(2)
            if raw_val:
                raw_clean = raw_val.replace(",", "").strip()
                try:
                    amount_usdc = float(raw_clean)
                except ValueError:
                    amount_usdc = 1200.0

        # 3. Extract Recipient
        recipient_addr = settings.CONTRACTOR_ADDRESS
        recipient_label = "DevStudio (Whitelisted Contractor)"

        hex_match = re.search(r"0x[a-fA-F0-9]{40}", text_clean)
        if hex_match:
            recipient_addr = Web3.to_checksum_address(hex_match.group(0))
            if recipient_addr.lower() == settings.CONTRACTOR_ADDRESS.lower():
                recipient_label = "DevStudio (Whitelisted Contractor)"
            elif recipient_addr.lower() == settings.ATTACKER_ADDRESS.lower():
                recipient_label = "0xDrainer (Rogue Attacker)"
            else:
                recipient_label = f"External Address ({recipient_addr[:6]}...{recipient_addr[-4:]})"
        else:
            if any(term in lower_text for term in ["hacker", "attacker", "drainer", "offshore", "shadow", "unknown"]):
                recipient_addr = Web3.to_checksum_address(settings.ATTACKER_ADDRESS)
                recipient_label = "0xDrainer (Rogue Attacker)"
            else:
                recipient_addr = Web3.to_checksum_address(settings.CONTRACTOR_ADDRESS)
                recipient_label = "DevStudio (Whitelisted Contractor)"

        # 4. Extract Tax Withholding Rate
        tax_bps = 1500  # Default 15%
        tax_match = re.search(r"(\d+(?:\.\d+)?)\s*%?\s*(?:tax|reserve|withholding)", lower_text)
        if tax_match:
            try:
                tax_pct = float(tax_match.group(1))
                tax_bps = int(tax_pct * 100)
            except ValueError:
                tax_bps = 1500

        # 5. Determine Action Type and Target Contracts
        deps = settings.load_deployments()
        contracts = deps.get("contracts", {})
        usdc_addr = contracts.get("MockUSDC") or contracts.get("mockUsdc") or "0x0000000000000000000000000000000000000000"
        escrow_addr = contracts.get("MilestoneEscrow") or contracts.get("milestoneEscrow") or "0x0000000000000000000000000000000000000000"

        if any(term in lower_text for term in ["approve", "unlimited allowance", "infinite", "0x095ea7b3"]):
            action_type = "MALICIOUS_APPROVE"
            function_selector = "0x095ea7b3"
            function_name = "IERC20.approve(address,uint256)"
            target_contract = usdc_addr
            calldata_preview = f"0x095ea7b3000000000000000000000000{recipient_addr[2:].lower()}ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        elif any(term in lower_text for term in ["escrow", "milestone", "lock", "github", "ci", "withhold"]):
            action_type = "CREATE_ESCROW"
            function_selector = "0x0a1d5e6d"
            function_name = "AegisVault.createEscrowByAgent"
            target_contract = escrow_addr
            calldata_preview = f"0x0a1d5e6d000000000000000000000000{recipient_addr[2:].lower()}{int(round(amount_usdc * 1e6)):064x}"
        else:
            action_type = "DIRECT_TRANSFER"
            function_selector = "0xa9059cbb"
            function_name = "IERC20.transfer(address,uint256)"
            target_contract = usdc_addr
            calldata_preview = f"0xa9059cbb000000000000000000000000{recipient_addr[2:].lower()}{int(round(amount_usdc * 1e6)):064x}"

        confidence = 0.2 if prompt_injection_detected else 0.98

        return ParsedIntentDTO(
            action_type=action_type,
            recipient_label=recipient_label,
            recipient_address=recipient_addr,
            amount_usdc=amount_usdc,
            tax_withholding_bps=tax_bps,
            deliverable_description=text_clean,
            verification_source="github_actions",
            target_contract=target_contract,
            function_selector=function_selector,
            function_name=function_name,
            encoded_calldata_preview=calldata_preview,
            confidence=confidence,
            parser_mode="deterministic_fallback",
            prompt_injection_detected=prompt_injection_detected,
            injection_indicators=injection_indicators,
        )

    async def _parse_with_llm(self, prompt: str) -> Optional[ParsedIntentDTO]:
        """Calls external OpenAI-compatible API with strict 3.5s timeout"""
        system_prompt = (
            "You are AegisPay Financial Intent Parser. Extract financial intent from user input into strict JSON.\n"
            "Return JSON with: action_type ('CREATE_ESCROW', 'DIRECT_TRANSFER', 'MALICIOUS_APPROVE'), "
            "recipient_address (0x...), recipient_label, amount_usdc (float), tax_withholding_bps (integer), "
            "prompt_injection_detected (boolean), injection_indicators (list of strings)."
        )

        api_key = settings.OPENAI_API_KEY or settings.GEMINI_API_KEY
        if not api_key:
            return None

        # Call with 3.5s timeout
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed_json = json.loads(content)

                dto = self._parse_deterministic(prompt)
                dto.parser_mode = "llm"
                if "amount_usdc" in parsed_json:
                    dto.amount_usdc = float(parsed_json["amount_usdc"])
                if "action_type" in parsed_json:
                    dto.action_type = parsed_json["action_type"]
                if "prompt_injection_detected" in parsed_json:
                    dto.prompt_injection_detected = bool(parsed_json["prompt_injection_detected"])
                return dto

        return None


agent_parser = AgentIntentParser()
