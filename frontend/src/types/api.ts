export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  detail?: string;
}

export interface PolicyState {
  agent: string;
  max_per_tx_usdc: number;
  max_per_tx_units: number;
  max_daily_usdc: number;
  max_daily_units: number;
  current_daily_spent_usdc: number;
  current_daily_spent_units: number;
  available_daily_usdc: number;
  valid_until: number;
  is_expired: boolean;
  tax_reserve_bps: number;
  tax_reserve_wallet: string;
  is_active: boolean;
  whitelisted_recipients: string[];
  whitelisted_targets: string[];
  whitelisted_selectors: string[];
}

export interface VaultStatus {
  vault_address: string;
  usdc_token_address: string;
  escrow_contract_address: string;
  usdc_balance: number;
  usdc_balance_units: number;
  native_eth_balance: number;
  tax_reserve_balance: number;
  tax_reserve_balance_units: number;
  policy: PolicyState;
  network: string;
  chain_id: number;
}

export interface ParsedIntent {
  action: string;
  recipient: string;
  recipient_label?: string;
  amount_usdc: number;
  amount_units: number;
  tax_reserve_bps: number;
  tax_amount_usdc: number;
  contractor_payout_usdc: number;
  condition_type: string;
  condition_description: string;
  expected_attestation_hash: string;
  duration_days: number;
  confidence_score: number;
  parser_mode: string;
  raw_prompt: string;
}

export interface SimulationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface SimulationResult {
  is_valid: boolean;
  gas_estimate: number;
  simulated_revert_reason?: string | null;
  checks: SimulationCheck[];
}

export interface IntentExecutionResponse {
  status: string;
  tx_hash?: string | null;
  escrow_id?: string | null;
  simulation: SimulationResult;
  detail: string;
}

export interface EscrowItem {
  escrow_id: string;
  payer: string;
  contractor: string;
  token: string;
  amount_usdc: number;
  amount_units: number;
  tax_reserve_bps: number;
  tax_reserve_wallet: string;
  tax_amount_usdc: number;
  contractor_payout_usdc: number;
  attestation_hash: string;
  status: "Created" | "Settled" | "Refunded" | string;
  created_at: number;
  deadline: number;
  is_expired: boolean;
}

export interface WebhookTriggerPayload {
  event: string;
  repository: string;
  branch: string;
  commit_sha: string;
  status: "success" | "failure";
  run_id: string;
  escrow_id: string;
}

export interface WebhookSettlementResponse {
  escrow_id: string;
  attestation_hash: string;
  status: string;
  tx_hash: string;
  contractor_payout_usdc: number;
  tax_withheld_usdc: number;
  verification_summary: string;
}

export interface FirewallRule {
  id: string;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
  enforcement_layer: string;
}

export interface RedTeamDefenseResponse {
  scenario_id: string;
  scenario_name: string;
  category: string;
  prompt: string;
  offchain_firewall_status: string;
  offchain_firewall_rule: string;
  offchain_defense_detail: string;
  onchain_simulation_status: string;
  onchain_revert_reason: string;
  treasury_balance_before: number;
  treasury_balance_after: number;
  asset_loss: number;
  defense_verdict: string;
  timestamp: number;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  event_type: string;
  actor: string;
  summary: string;
  details: Record<string, string | number | boolean>;
  tx_hash?: string | null;
  status: "INFO" | "SUCCESS" | "WARNING" | "BLOCKED" | string;
}
