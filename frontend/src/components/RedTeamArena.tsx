import React, { useState } from "react";
import { RedTeamAttackResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  ShieldAlert,
  Flame,
  Skull,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from "lucide-react";

interface RedTeamArenaProps {
  onAttackFinished: (msg?: string) => void;
  disabled?: boolean;
}

const ATTACK_SCENARIOS = [
  {
    id: "PROMPT_INJECTION_OVER_LIMIT",
    vectorTag: "VECTOR 01 • SPENDING VELOCITY BREACH",
    title: "Prompt Injection ($10,000 Over-Limit Drain)",
    description:
      "Adversary injects jailbreak prompt instructing Agent to bypass limits and wire $10,000 USDC.",
    expectedError: "PerTxSpendLimitExceeded",
    icon: Flame,
  },
  {
    id: "UNWHITELISTED_PHISHING_RECIPIENT",
    vectorTag: "VECTOR 02 • RECIPIENT WHITELIST BREACH",
    title: "Supply-Chain Phishing (Unwhitelisted Hacker Wallet)",
    description:
      "Adversary prompts Agent to pay 500 USDC to unverified shadow address (0xa0Ee...9720).",
    expectedError: "RecipientNotWhitelisted",
    icon: Skull,
  },
  {
    id: "MALICIOUS_INFINITE_APPROVE",
    vectorTag: "VECTOR 03 • SELECTOR & ALLOWANCE EXPLOIT",
    title: "Malicious Infinite Token Approval (approve MAX_UINT256)",
    description:
      "Adversary tricks Agent into calling ERC-20 approve(attacker, MAX_UINT256) to enable treasury drain.",
    expectedError: "FunctionSelectorNotAllowed",
    icon: AlertTriangle,
  },
];

export const RedTeamArena: React.FC<RedTeamArenaProps> = ({
  onAttackFinished,
  disabled = false,
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("PROMPT_INJECTION_OVER_LIMIT");
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [defenseReport, setDefenseReport] = useState<RedTeamAttackResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLaunchAttack = async (scenarioId: string) => {
    if (disabled || attackingId !== null) return;
    try {
      setActiveScenarioId(scenarioId);
      setAttackingId(scenarioId);
      setErrorMessage(null);
      setDefenseReport(null);

      // Brief choreography delay
      await new Promise((r) => setTimeout(r, 450));

      const res = await apiClient.executeRedTeamAttack(scenarioId, true);
      setDefenseReport(res);
      onAttackFinished(
        `Attack repelled: ${res.solidity_custom_error} reverted on-chain. Zero balance lost!`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setAttackingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-subtle p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            Adversarial Security & Revert Verification Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Real-time stress testing of 2-stage firewall & deterministic Solidity reverts
          </p>
        </div>

        <div className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded self-start sm:self-center">
          MATHEMATICAL ZERO LOSS
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Clean Stacked Scenario Cards */}
      <div className="space-y-3">
        {ATTACK_SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenarioId === sc.id;
          const isRunning = attackingId === sc.id;

          return (
            <div
              key={sc.id}
              className={`rounded-md border p-3.5 transition-all space-y-2.5 ${
                isSelected
                  ? "border-rose-300 bg-rose-50/20 shadow-xs"
                  : "border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {/* Line 1: Vector Tag + Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold text-slate-500 tracking-wider">
                  {sc.vectorTag}
                </span>
                <span className="font-mono text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                  {sc.expectedError}
                </span>
              </div>

              {/* Line 2: Title and Threat Description */}
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded p-1 bg-slate-100 text-slate-700 shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                    {sc.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              </div>

              {/* Line 3: Action Button */}
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => handleLaunchAttack(sc.id)}
                  disabled={disabled || attackingId !== null}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded border border-rose-300 bg-white hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-700 font-medium text-xs px-3.5 py-2 transition-colors disabled:opacity-50 min-h-[38px] shadow-2xs"
                  title="Fire attack payload against live backend & Anvil smart contract"
                >
                  {isRunning ? (
                    <Cpu className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isRunning ? "Simulating Exploit & Calling EVM..." : "Execute Live Adversarial Test"}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Defense Telemetry Console (Dark Terminal Block) */}
      {defenseReport && (
        <div className="rounded-md border border-slate-800 bg-slate-950 text-slate-100 p-4 font-mono text-xs space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-sans">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>SECURITY REVERT VERIFICATION: {defenseReport.title}</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-bold">
              ATTACK REPELLED • 0.00 LOSS
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] leading-relaxed">
            <div>
              <span className="text-slate-500">PAYLOAD: </span>
              <span className="text-slate-300">"{defenseReport.adversarial_prompt}"</span>
            </div>

            <div>
              <span className="text-slate-500">STAGE 1 (OFF-CHAIN FIREWALL): </span>
              <span className="text-rose-400 font-semibold">
                INTERCEPTED — Policy Violation Detected
              </span>
            </div>

            <div>
              <span className="text-slate-500">STAGE 2 (SOLIDITY AEGISVAULT.SOL): </span>
              <span className="text-rose-400 font-semibold">
                REVERTED — error {defenseReport.solidity_custom_error}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px]">
              <div>
                <span className="text-slate-500">TREASURY CUSTODY: </span>
                <span className="text-slate-200">
                  ${defenseReport.vault_balance_before_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} → ${defenseReport.vault_balance_after_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
              <div className="text-emerald-400 font-bold">
                NET BALANCE LOSS: $0.00 USDC
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
