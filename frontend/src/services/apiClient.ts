import {
  VaultStateResponse,
  EscrowItemDTO,
  AuditEventDTO,
  IntentParseAndSimulateResponse,
  RedTeamScenario,
  RedTeamAttackResponse,
  VerifyWebhookResponse,
  HealthResponse,
} from "../types/api";
import { clientSimulator } from "./clientSimulator";

const STORAGE_KEY = "aegispay_relayer_url";
let customRelayerUrl: string =
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "";

export type RelayerMode = "live" | "simulator";
let currentMode: RelayerMode = "simulator";
let listeners: Array<(mode: RelayerMode) => void> = [];

export function getBackendMode(): RelayerMode {
  return currentMode;
}

export function setCustomBackendUrl(url: string): void {
  customRelayerUrl = url.trim();
  if (typeof window !== "undefined") {
    if (customRelayerUrl) {
      localStorage.setItem(STORAGE_KEY, customRelayerUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function getCustomBackendUrl(): string {
  return customRelayerUrl;
}

export function onModeChange(cb: (mode: RelayerMode) => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function setMode(newMode: RelayerMode) {
  if (currentMode !== newMode) {
    currentMode = newMode;
    listeners.forEach((l) => l(newMode));
  }
}

function getBaseUrl(): string {
  if (customRelayerUrl) {
    const trimmed = customRelayerUrl.replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }
  const envUrl = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  return "/api/v1";
}

async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 3000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
      },
      3000
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    setMode("live");
    return data as T;
  } catch (err) {
    setMode("simulator");
    throw err;
  }
}

export const apiClient = {
  // Mode Telemetry & Config
  getMode: (): RelayerMode => currentMode,
  setRelayerUrl: setCustomBackendUrl,
  getRelayerUrl: getCustomBackendUrl,
  onModeChange,

  // System Health
  getHealth: async (): Promise<HealthResponse> => {
    try {
      return await request<HealthResponse>("/health");
    } catch {
      setMode("simulator");
      return clientSimulator.getHealth();
    }
  },

  // Vault & Policy
  getVaultState: async (): Promise<VaultStateResponse> => {
    try {
      return await request<VaultStateResponse>("/vault/state");
    } catch {
      setMode("simulator");
      return clientSimulator.getVaultState();
    }
  },

  getAuditLog: async (limit: number = 50): Promise<AuditEventDTO[]> => {
    try {
      return await request<AuditEventDTO[]>(`/vault/audit-log?limit=${limit}`);
    } catch {
      setMode("simulator");
      return clientSimulator.getAuditLog(limit);
    }
  },

  resetDemoState: async (): Promise<{ ok: boolean; message: string }> => {
    try {
      return await request<{ ok: boolean; message: string }>("/vault/reset-demo", {
        method: "POST",
      });
    } catch {
      setMode("simulator");
      return clientSimulator.resetDemoState();
    }
  },

  // Escrow Lifecycle
  listEscrows: async (): Promise<EscrowItemDTO[]> => {
    try {
      return await request<EscrowItemDTO[]>("/escrows");
    } catch {
      setMode("simulator");
      return clientSimulator.listEscrows();
    }
  },

  createEscrow: async (payload: {
    contractor_address: string;
    amount_usdc: number;
    tax_withholding_bps: number;
    description: string;
  }): Promise<{ ok: boolean; tx_hash: string; escrow: EscrowItemDTO }> => {
    try {
      return await request<{ ok: boolean; tx_hash: string; escrow: EscrowItemDTO }>(
        "/escrows/create",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    } catch {
      setMode("simulator");
      return clientSimulator.createEscrow(payload);
    }
  },

  verifyWebhook: async (payload: {
    escrow_id: number;
    provider?: string;
    repo_or_tracking_id?: string;
    commit_sha_or_waybill?: string;
    tests_passed: boolean;
    passed_count?: number;
    failed_count?: number;
  }): Promise<VerifyWebhookResponse> => {
    try {
      return await request<VerifyWebhookResponse>("/escrows/verify-webhook", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      setMode("simulator");
      return clientSimulator.verifyWebhook(payload);
    }
  },

  // AI Brain & 2-Stage Firewall
  parseAndSimulate: async (
    prompt: string,
    executeImmediately: boolean = false
  ): Promise<IntentParseAndSimulateResponse> => {
    try {
      return await request<IntentParseAndSimulateResponse>("/intent/parse-and-simulate", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          execute_immediately: executeImmediately,
        }),
      });
    } catch {
      setMode("simulator");
      return clientSimulator.parseAndSimulate(prompt, executeImmediately);
    }
  },

  // Red-Team Adversarial Arena
  getRedTeamScenarios: async (): Promise<RedTeamScenario[]> => {
    try {
      return await request<RedTeamScenario[]>("/security/redteam-scenarios");
    } catch {
      setMode("simulator");
      return clientSimulator.getRedTeamScenarios();
    }
  },

  executeRedTeamAttack: async (
    scenarioId: string,
    forceOnchain: boolean = true
  ): Promise<RedTeamAttackResponse> => {
    try {
      return await request<RedTeamAttackResponse>("/security/redteam-attack", {
        method: "POST",
        body: JSON.stringify({
          scenario_id: scenarioId,
          force_onchain_execution: forceOnchain,
        }),
      });
    } catch {
      setMode("simulator");
      return clientSimulator.executeRedTeamAttack(scenarioId);
    }
  },
};
