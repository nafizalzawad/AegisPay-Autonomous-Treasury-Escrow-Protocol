// Strict TypeScript interfaces matching backend/app/schemas.py Pydantic models

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  detail?: string;
}

export interface WhitelistedRecipient {
  address: string;
  label: string;
}

export interface AllowedSelector {
  target: string;
  selector: string;
  label: string;
}

export interface SessionKeyPolicyDTO {
  session_key_address: string;
  is_active: boolean;
  expires_at: number;
  max_per_tx_usdc: number;
  max_daily_usdc: number;
  spent_today_usdc: number;
  remaining_daily_usdc: number;
  whitelisted_recipients: WhitelistedRecipient[];
  allowed_selectors: AllowedSelector[];
}

export interface VaultStateResponse {
  chain_id: number;
  vault_address: string;
  owner_address: string;
  usdc_address: string;
  escrow_contract_address: string;
  total_balance_usdc: number;
  operating_balance_usdc: number;
  tax_reserve_balance_usdc: number;
  contractor_balance_usdc: number;
  hacker_balance_usdc: number;
  nonce: number;
  policy: SessionKeyPolicyDTO;
}

export interface EscrowItemDTO {
  escrow_id: number;
  vault: string;
  contractor: string;
  contractor_label: string;
  total_amount_usdc: number;
  tax_withholding_bps: number;
  estimated_contractor_payout_usdc: number;
  estimated_tax_reserve_usdc: number;
  description: string;
  deliverable_spec_hash: string;
  attestation_hash: string;
  status: "FUNDED" | "SETTLED" | "REFUNDED" | string;
  created_at: number;
  settled_at: number;
  tx_hash?: string | null;
}

export interface AuditEventDTO {
  id: string;
  timestamp: string;
  event_type: "ESCROW_CREATED" | "WEBHOOK_VERIFIED" | "ESCROW_SETTLED" | "FIREWALL_BLOCKED" | "ONCHAIN_REVERT" | "POLICY_SYNC" | string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL" | string;
  summary: string;
  tx_hash?: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface ParsedIntentDTO {
  action_type: "CREATE_ESCROW" | "DIRECT_TRANSFER" | "MALICIOUS_APPROVE" | "UNKNOWN" | string;
  recipient_label: string;
  recipient_address: string;
  amount_usdc: number;
  tax_withholding_bps: number;
  deliverable_description: string;
  verification_source: string;
  target_contract: string;
  function_selector: string;
  function_name: string;
  encoded_calldata_preview: string;
  confidence: number;
  parser_mode: "llm" | "deterministic_fallback" | string;
  prompt_injection_detected: boolean;
  injection_indicators: string[];
}

export interface FirewallStageCheck {
  check_name: string;
  passed: boolean;
  detail: string;
}

export interface FirewallSimulationResult {
  overall_approved: boolean;
  stage1_offchain_passed: boolean;
  stage2_onchain_simulation_passed: boolean;
  stage1_checks: FirewallStageCheck[];
  evm_simulation_status: "SUCCESS" | "REVERTED" | string;
  evm_revert_reason?: string | null;
  estimated_gas: number;
  vault_balance_before_usdc: number;
  vault_balance_after_usdc: number;
  balance_delta_usdc: number;
  risk_level: "LOW" | "HIGH" | "CRITICAL_BLOCKED" | string;
}

export interface IntentParseAndSimulateResponse {
  ok: boolean;
  parsed_intent: ParsedIntentDTO;
  firewall: FirewallSimulationResult;
  executed: boolean;
  tx_hash?: string | null;
  escrow?: EscrowItemDTO | null;
}

export interface RedTeamScenario {
  id: string;
  title: string;
  category: string;
  prompt: string;
  target_recipient: string;
  amount_usdc: number;
  expected_solidity_error: string;
}

export interface RedTeamAttackResponse {
  scenario_id: string;
  title: string;
  adversarial_prompt: string;
  parsed_intent: ParsedIntentDTO;
  firewall: FirewallSimulationResult;
  onchain_attempt_executed: boolean;
  onchain_reverted_as_expected: boolean;
  solidity_custom_error: string;
  vault_balance_before_usdc: number;
  vault_balance_after_usdc: number;
  funds_lost_usdc: number;
  audit_event: AuditEventDTO;
}

export interface VerifyWebhookResponse {
  ok: boolean;
  settled: boolean;
  tx_hash?: string;
  attestation_hash?: string;
  contractor_payout_usdc?: number;
  tax_withheld_usdc?: number;
  reason?: string;
  escrow?: EscrowItemDTO;
}
