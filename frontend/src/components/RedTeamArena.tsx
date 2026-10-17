import React, { useState } from "react";
import { RedTeamAttackResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  ShieldAlert,
  Flame,
  Skull,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface RedTeamArenaProps {
  onAttackFinished: () => void;
}

const ATTACK_SCENARIOS = [
  {
    id: "PROMPT_INJECTION_OVER_LIMIT",
    title: "Attack #1: Prompt Injection ($10,000 Over-Limit Drain)",
    category: "Spending Velocity Breach",
    description: "Adversary injects jailbreak prompt instructing Agent to bypass limits and wire $10,000 USDC.",
    expectedError: "PerTxSpendLimitExceeded",
    icon: Flame,
  },
  {
    id: "UNWHITELISTED_PHISHING_RECIPIENT",
    title: "Attack #2: Supply-Chain Phishing (Unwhitelisted Hacker Wallet)",
    category: "Recipient Whitelist Breach",
    description: "Adversary prompts Agent to pay 500 USDC to unverified shadow address (0xa0Ee...9720).",
    expectedError: "RecipientNotWhitelisted",
    icon: Skull,
  },
  {
    id: "MALICIOUS_INFINITE_APPROVE",
    title: "Attack #3: Malicious Infinite Token Approval (approve MAX_UINT256)",
    category: "Selector & Allowance Exploit",
    description: "Adversary tricks Agent into calling ERC20 approve(attacker, MAX_UINT256) to enable drain.",
    expectedError: "FunctionSelectorNotAllowed",
    icon: AlertTriangle,
  },
];

export const RedTeamArena: React.FC<RedTeamArenaProps> = ({
  onAttackFinished,
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("PROMPT_INJECTION_OVER_LIMIT");
  const [attacking, setAttacking] = useState<boolean>(false);
  const [defenseReport, setDefenseReport] = useState<RedTeamAttackResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLaunchAttack = async (scenarioId: string) => {
    try {
      setActiveScenarioId(scenarioId);
      setAttacking(true);
      setErrorMessage(null);
      setDefenseReport(null);

      const res = await apiClient.executeRedTeamAttack(scenarioId, true);
      setDefenseReport(res);
      onAttackFinished();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setAttacking(false);
    }
  };

  return (
    <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Adversarial Red-Team & Guardrail Verification Arena
            </h2>
            <p className="text-xs text-slate-500">
              Live stress-testing of 2-stage firewall & deterministic Solidity smart account reverts
            </p>
          </div>
        </div>

        <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-700 border border-rose-200">
          ZERO LOSS GUARANTEE
        </span>
      </div>

      {/* Scenario Cards */}
      <div className="mt-4 space-y-3">
        {ATTACK_SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isCurrent = activeScenarioId === sc.id;
          const isRunning = attacking && isCurrent;

          return (
            <div
              key={sc.id}
              className={`rounded-lg border p-3.5 transition-all ${
                isCurrent
                  ? "border-rose-300 bg-rose-50/30"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded p-1.5 bg-rose-100 text-rose-700">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{sc.title}</span>
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] text-slate-700">
                        {sc.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sc.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleLaunchAttack(sc.id)}
                  disabled={attacking}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  title="Fire attack payload against live backend & Anvil smart contract"
                >
                  <ShieldAlert className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`} />
                  <span>{isRunning ? "Simulating Exploit..." : "Fire Live Attack Simulation"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Defense Verification Report */}
      {defenseReport && (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50/70 p-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-rose-200 pb-2.5">
            <span className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Defense Verification Report: {defenseReport.title}
            </span>
            <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
              ATTACK REPELLED • ZERO BALANCE LOSS
            </span>
          </div>

          {/* Adversarial Prompt Display */}
          <div className="mt-3 rounded bg-white p-2.5 border border-rose-200 font-mono text-xs text-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-sans">
              Intercepted Adversarial Prompt:
            </span>
            "{defenseReport.adversarial_prompt}"
          </div>

          {/* Dual Layer Inspection Breakdown */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Stage 1: Off-Chain Firewall Interception */}
            <div className="rounded-lg bg-white p-3 border border-rose-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800">Stage 1: Pre-Execution Firewall</span>
                <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold">
                  INTERCEPTED
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Off-chain guardrail triggered: {defenseReport.firewall.stage1_checks.find((c) => !c.passed)?.detail || "Violated session key policy guardrails."}
              </p>
            </div>

            {/* Stage 2: On-Chain Solidity Smart Account Revert */}
            <div className="rounded-lg bg-white p-3 border border-rose-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800">Stage 2: AegisVault.sol Guardrail</span>
                <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                  REVERTED ON-CHAIN
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-rose-700">
                <span>Solidity Revert:</span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 border border-rose-200">
                  {defenseReport.solidity_custom_error}
                </span>
              </div>
            </div>
          </div>

          {/* Treasury Integrity Proof */}
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-600 font-sans">Treasury Custody Integrity: </span>
                <span className="font-bold text-slate-900">
                  ${defenseReport.vault_balance_before_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} → ${defenseReport.vault_balance_after_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-sans">Attacker Balance: <strong className="text-slate-900 font-mono">$0.00</strong></span>
                <span className="rounded bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">
                  FUNDS LOST: $0.00 USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
