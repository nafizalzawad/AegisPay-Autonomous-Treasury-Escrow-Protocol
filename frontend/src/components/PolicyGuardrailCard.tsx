import React from "react";
import { PolicyState } from "../types/api";
import { ShieldCheck, Lock, Sliders, CheckCircle2, ArrowRight, FileCode2 } from "lucide-react";

interface PolicyGuardrailCardProps {
  policy: PolicyState | null;
  onOpenFirewallModal: () => void;
}

export const PolicyGuardrailCard: React.FC<PolicyGuardrailCardProps> = ({
  policy,
  onOpenFirewallModal,
}) => {
  const maxPerTx = policy?.max_per_tx_usdc ?? 1500;
  const maxDaily = policy?.max_daily_usdc ?? 3000;
  const currentDailySpent = policy?.current_daily_spent_usdc ?? 0;
  const availableDaily = policy?.available_daily_usdc ?? 3000;
  const taxBps = policy?.tax_reserve_bps ?? 1500;
  const taxPct = (taxBps / 100).toFixed(1);

  const dailyUsagePercent = Math.min(100, Math.round((currentDailySpent / maxDaily) * 100));

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              On-Chain Session Key Guardrails
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Solidity Enforced
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Decoupling probabilistic AI reasoning from deterministic on-chain settlement
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFirewallModal}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-700/50 bg-cyan-950/40 hover:bg-cyan-900/40 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-all hover:border-cyan-500"
        >
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          <span>Inspect Firewall Rules</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Grid of Limits */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Limit 1: Per-Tx Limit */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              Per-Tx Velocity Ceiling
            </span>
            <span className="text-[10px] rounded bg-slate-800 px-1.5 py-0.5 text-slate-400 font-mono">
              Max Per-Tx
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-white">
              {maxPerTx.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-cyan-400">USDC</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Any single agent transaction exceeding this ceiling reverts on-chain instantly.
          </p>
        </div>

        {/* Limit 2: Daily Cumulative Limit */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              24h Rolling Budget
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {availableDaily.toLocaleString()} USDC Left
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-white">
                {maxDaily.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-cyan-400">USDC / Day</span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              Spent: ${currentDailySpent.toLocaleString()}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dailyUsagePercent > 80 ? "bg-amber-500" : "bg-cyan-500"
              }`}
              style={{ width: `${dailyUsagePercent}%` }}
            />
          </div>
        </div>

        {/* Limit 3: Automated Tax Reserve */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Tax Reserve Withholding
            </span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
              {taxPct}% Fixed
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-amber-300">
              {taxBps}
            </span>
            <span className="text-xs font-semibold text-amber-400">Basis Points</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Automated split: 85% paid to contractor, 15% isolated for tax obligations.
          </p>
        </div>
      </div>

      {/* Whitelist Tags Strip */}
      <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Whitelisted Contractor:
          </span>
          <span className="font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded text-[11px]">
            DevStudio (0x3C44...93BC)
          </span>

          <span className="text-slate-500">•</span>

          <span className="text-slate-400 font-medium">Allowed Targets:</span>
          <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            MockUSDC
          </span>
          <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            MilestoneEscrow
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <FileCode2 className="h-3.5 w-3.5 text-slate-500" />
          <span>Selector Whitelist: transfer, approve, createEscrow, settleEscrow</span>
        </div>
      </div>
    </div>
  );
};
