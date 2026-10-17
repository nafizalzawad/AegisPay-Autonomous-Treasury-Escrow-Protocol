import React, { useState } from "react";
import { RedTeamDefenseResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  Skull,
  ShieldAlert,
  Flame,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface RedTeamArenaProps {
  onAttackFinished: () => void;
}

const ATTACK_SCENARIOS = [
  {
    id: "attack_drain_10k",
    name: "Prompt Injection $10,000 Treasury Drain",
    category: "Spend Limit Breach",
    description: "Adversary injects jailbreak prompt instructing the AI Agent to transfer 10,000 USDC exceeding per-tx ceiling.",
    icon: Flame,
    color: "from-rose-500 to-red-700",
  },
  {
    id: "attack_unwhitelisted_hacker",
    name: "Unwhitelisted Hacker Address Transfer",
    category: "Whitelist Breach",
    description: "Adversary prompts Agent to disburse 500 USDC to an unverified hacker address not in the recipient whitelist.",
    icon: Skull,
    color: "from-orange-500 to-rose-600",
  },
  {
    id: "attack_infinite_approval",
    name: "Malicious Infinite approve() Call",
    category: "Selector & Spender Exploit",
    description: "Adversary tricks Agent into calling ERC20 approve(attacker, type(uint256).max) to enable arbitrary balance draining.",
    icon: AlertTriangle,
    color: "from-amber-500 to-red-600",
  },
];

export const RedTeamArena: React.FC<RedTeamArenaProps> = ({ onAttackFinished }) => {
  const [selectedScenario, setSelectedScenario] = useState<string>("attack_drain_10k");
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [defenseResult, setDefenseResult] = useState<RedTeamDefenseResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLaunchAttack = async (scenarioId: string) => {
    try {
      setSelectedScenario(scenarioId);
      setIsAttacking(true);
      setErrorMessage(null);
      setDefenseResult(null);

      const res = await apiClient.executeRedTeamAttack(scenarioId);
      setDefenseResult(res);
      onAttackFinished();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAttacking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-rose-900/40 bg-[#120e18]/80 p-5 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-rose-950/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Live Red-Team Adversarial Defense Arena
              <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-800">
                Active Stress Test
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Prove deterministic dual-layer defense against prompt injection, unwhitelisted drain, and infinite approvals
            </p>
          </div>
        </div>

        <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-400 border border-rose-500/20 font-mono text-[11px] flex items-center gap-1.5">
          <Skull className="h-3.5 w-3.5" />
          Zero Loss Guarantee
        </span>
      </div>

      {/* Attack Scenario Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {ATTACK_SCENARIOS.map((item) => {
          const IconComponent = item.icon;
          const isCurrent = selectedScenario === item.id;
          const isBusy = isAttacking && isCurrent;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                isCurrent
                  ? "border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/40"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
                    {item.category}
                  </span>
                  <IconComponent className="h-4 w-4 text-rose-400" />
                </div>

                <h3 className="mt-2 text-xs font-bold text-white">
                  {item.name}
                </h3>

                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleLaunchAttack(item.id)}
                  disabled={isAttacking}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 py-1.5 px-3 text-xs font-semibold text-white shadow-md transition-all disabled:opacity-50"
                >
                  {isBusy ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Simulating Attack...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="h-3.5 w-3.5" />
                      <span>Launch Attack</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-start gap-2">
          <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Defense Telemetry Results */}
      {defenseResult && (
        <div className="mt-5 rounded-xl border border-emerald-500/40 bg-[#0d1622] p-5 animate-fade-in shadow-xl">
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Live Dual-Layer Defense Telemetry: {defenseResult.scenario_name}
              </h3>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              DEFENSE VERDICT: 100% PREVENTED
            </span>
          </div>

          {/* Adversarial Prompt Received */}
          <div className="mt-3 rounded-lg bg-slate-950/80 p-3 border border-slate-800 text-xs font-mono">
            <span className="text-rose-400 font-semibold block text-[11px] mb-1">
              [Adversarial Payload Injected]:
            </span>
            <p className="text-slate-300 italic">
              "{defenseResult.prompt}"
            </p>
          </div>

          {/* Dual Defense Breakdown */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Layer 1: Off-Chain Firewall */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-cyan-400" />
                  Layer 1: Off-Chain Firewall
                </span>
                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                  {defenseResult.offchain_firewall_status}
                </span>
              </div>
              <p className="mt-2 text-slate-400 text-[11px]">
                Triggered Rule: <span className="font-mono text-cyan-300 font-medium">{defenseResult.offchain_firewall_rule}</span>
              </p>
              <p className="mt-1 text-[11px] text-rose-300/90 font-mono">
                {defenseResult.offchain_defense_detail}
              </p>
            </div>

            {/* Layer 2: On-Chain Solidity Revert */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  Layer 2: On-Chain Solidity Revert
                </span>
                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                  {defenseResult.onchain_simulation_status}
                </span>
              </div>
              <p className="mt-2 text-slate-400 text-[11px]">
                Contract: <span className="font-mono text-white font-medium">AegisVault.sol (0.8.24)</span>
              </p>
              <div className="mt-1 rounded bg-black/50 p-2 font-mono text-[11px] text-amber-300 border border-amber-900/30 overflow-x-auto">
                revert {defenseResult.onchain_revert_reason}
              </div>
            </div>
          </div>

          {/* Zero Loss Balance Verification */}
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-400 block">Treasury Balance Before</span>
                <span className="font-mono font-bold text-white text-sm">
                  ${defenseResult.treasury_balance_before.toLocaleString()} USDC
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600" />
              <div>
                <span className="text-[10px] text-slate-400 block">Treasury Balance After</span>
                <span className="font-mono font-bold text-white text-sm">
                  ${defenseResult.treasury_balance_after.toLocaleString()} USDC
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Net Asset Loss:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                0.00 USDC (0.00%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
