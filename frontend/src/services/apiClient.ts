import {
  ApiResponse,
  VaultStatus,
  ParsedIntent,
  SimulationResult,
  IntentExecutionResponse,
  EscrowItem,
  WebhookTriggerPayload,
  WebhookSettlementResponse,
  FirewallRule,
  RedTeamDefenseResponse,
  AuditEvent,
} from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorText}`);
  }

  const json: ApiResponse<T> = await response.json();
  if (!json.ok) {
    throw new Error(json.error || json.detail || "API returned unhandled failure");
  }

  return json.data as T;
}

export const apiClient = {
  // Vault & Policy
  getVaultStatus: (): Promise<VaultStatus> => request<VaultStatus>("/vault/status"),
  requestFaucet: (recipient: string, amount_usdc: number = 1000): Promise<{ status: string; tx_hash?: string }> =>
    request<{ status: string; tx_hash?: string }>("/vault/faucet", {
      method: "POST",
      body: JSON.stringify({ recipient, amount_usdc }),
    }),

  // Intent & Simulation
  parseIntent: (text: string): Promise<ParsedIntent> =>
    request<ParsedIntent>("/intent/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  simulateIntent: (intent: ParsedIntent): Promise<SimulationResult> =>
    request<SimulationResult>("/intent/simulate", {
      method: "POST",
      body: JSON.stringify(intent),
    }),
  executeIntent: (parsed_intent: ParsedIntent): Promise<IntentExecutionResponse> =>
    request<IntentExecutionResponse>("/intent/execute", {
      method: "POST",
      body: JSON.stringify({ parsed_intent, auto_execute: true }),
    }),

  // Escrow Lifecycle
  listEscrows: (): Promise<EscrowItem[]> => request<EscrowItem[]>("/escrow/list"),
  getEscrow: (escrowId: string): Promise<EscrowItem> =>
    request<EscrowItem>(`/escrow/${escrowId}`),
  triggerGithubWebhook: (payload: WebhookTriggerPayload): Promise<WebhookSettlementResponse> =>
    request<WebhookSettlementResponse>("/escrow/webhook/github", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Security & Red-Team
  getFirewallRules: (): Promise<FirewallRule[]> =>
    request<FirewallRule[]>("/security/firewall/rules"),
  executeRedTeamAttack: (scenario_id: string): Promise<RedTeamDefenseResponse> =>
    request<RedTeamDefenseResponse>("/security/redteam/attack", {
      method: "POST",
      body: JSON.stringify({ scenario_id }),
    }),
  getAuditTrail: (limit: number = 50): Promise<AuditEvent[]> =>
    request<AuditEvent[]>(`/security/audit-trail?limit=${limit}`),
};
