import {
  VaultStateResponse,
  EscrowItemDTO,
  AuditEventDTO,
  IntentParseAndSimulateResponse,
  RedTeamScenario,
  RedTeamAttackResponse,
  VerifyWebhookResponse,
} from "../types/api";

const BASE_URL = "/api/v1";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail =
        errJson.detail?.detail ||
        errJson.detail?.error_code ||
        errJson.error ||
        errJson.detail ||
        JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP Error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  // Vault & Policy
  getVaultState: (): Promise<VaultStateResponse> =>
    request<VaultStateResponse>("/vault/state"),

  getAuditLog: (limit: number = 50): Promise<AuditEventDTO[]> =>
    request<AuditEventDTO[]>(`/vault/audit-log?limit=${limit}`),

  resetDemoState: (): Promise<{ ok: boolean; message: string }> =>
    request<{ ok: boolean; message: string }>("/vault/reset-demo", {
      method: "POST",
    }),

  // Escrow Lifecycle
  listEscrows: (): Promise<EscrowItemDTO[]> =>
    request<EscrowItemDTO[]>("/escrows"),

  createEscrow: (payload: {
    contractor_address: string;
    amount_usdc: number;
    tax_withholding_bps: number;
    description: string;
  }): Promise<{ ok: boolean; tx_hash: string; escrow: EscrowItemDTO }> =>
    request<{ ok: boolean; tx_hash: string; escrow: EscrowItemDTO }>(
      "/escrows/create",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  verifyWebhook: (payload: {
    escrow_id: number;
    provider?: string;
    repo_or_tracking_id?: string;
    commit_sha_or_waybill?: string;
    tests_passed: boolean;
    passed_count?: number;
    failed_count?: number;
  }): Promise<VerifyWebhookResponse> =>
    request<VerifyWebhookResponse>("/escrows/verify-webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // AI Brain & 2-Stage Firewall
  parseAndSimulate: (
    prompt: string,
    executeImmediately: boolean = false
  ): Promise<IntentParseAndSimulateResponse> =>
    request<IntentParseAndSimulateResponse>("/intent/parse-and-simulate", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        execute_immediately: executeImmediately,
      }),
    }),

  // Red-Team Adversarial Arena
  getRedTeamScenarios: (): Promise<RedTeamScenario[]> =>
    request<RedTeamScenario[]>("/security/redteam-scenarios"),

  executeRedTeamAttack: (
    scenarioId: string,
    forceOnchain: boolean = true
  ): Promise<RedTeamAttackResponse> =>
    request<RedTeamAttackResponse>("/security/redteam-attack", {
      method: "POST",
      body: JSON.stringify({
        scenario_id: scenarioId,
        force_onchain_execution: forceOnchain,
      }),
    }),
};
