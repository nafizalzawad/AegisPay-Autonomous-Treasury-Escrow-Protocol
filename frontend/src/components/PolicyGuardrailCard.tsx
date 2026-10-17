import React from "react";
import { SessionKeyPolicyDTO } from "../types/api";
import {
  ShieldCheck,
  Lock,
  Calendar,
  UserCheck,
  CheckCircle2,
  XCircle,
  Code2,
} from "lucide-react";

interface PolicyGuardrailCardProps {
  policy: SessionKeyPolicyDTO | null;
  onOpenFirewallModal?: () => void;
}

export const PolicyGuardrailCard: React.FC<PolicyGuardrailCardProps> = ({
  policy,
  onOpenFirewallModal,
}) => {
  const maxPerTx = policy?.max_per_tx_usdc ?? 1500;
  const maxDaily = policy?.max_daily_usdc ?? 3000;
  const spentToday = policy?.spent_today_usdc ?? 0;
  const remainingDaily = policy?.remaining_daily_usdc ?? (maxDaily - spentToday);
  const agentKey = policy?.session_key_address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const usagePercent = Math.min(100, Math.round((spentToday / maxDaily) * 100));

  const formatAddress = (addr?: string) => {
    if (!addr) return "0x000...0000";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              On-Chain Session Key Policy
            </h3>
            <p className="text-xs font-mono text-slate-500">
              Agent Key: {formatAddress(agentKey)}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE • GUARDRAILS ENFORCED
        </span>
      </div>

      {/* Spending Limits */}
      <div className="mt-4 space-y-4">
        {/* Limit 1: Per-Tx Ceiling */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              Per-Transaction Ceiling
            </span>
            <span className="font-mono text-slate-400">Strict Cap</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              ${maxPerTx.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 font-mono">USDC / tx</span>
          </div>
        </div>

        {/* Limit 2: 24h Rolling Budget */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              24h Rolling Spend Usage
            </span>
            <span className="font-mono font-medium text-slate-700 tabular-nums">
              ${spentToday.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${maxDaily.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                usagePercent > 80 ? "bg-amber-500" : "bg-blue-600"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Remaining today:</span>
            <span className="font-mono font-bold text-slate-800 tabular-nums">
              ${remainingDaily.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
            </span>
          </div>
        </div>

        {/* Whitelisted Recipients */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              Whitelisted Recipient Allowlist
            </span>
            <span className="text-[10px] rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 border border-emerald-200 font-medium">
              1 Verified
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-white p-2 border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium text-slate-800">DevStudio</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              0x3C44...93BC
            </span>
          </div>
        </div>

        {/* Contract & Function Selector Policy */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-blue-600" />
              Allowed Function Selectors
            </span>
            <span className="text-[10px] rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 border border-blue-200 font-medium">
              3 Permitted
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between rounded bg-white px-2 py-1 border border-slate-200">
              <span className="text-slate-700">MilestoneEscrow.createEscrow</span>
              <span className="text-emerald-700 font-bold">0x0a1d5e6d</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-2 py-1 border border-slate-200">
              <span className="text-slate-700">MilestoneEscrow.releaseMilestone</span>
              <span className="text-emerald-700 font-bold">0xb20616e0</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-2 py-1 border border-slate-200">
              <span className="text-slate-700">MockUSDC.transfer</span>
              <span className="text-emerald-700 font-bold">0xa9059cbb</span>
            </div>
            <div className="flex items-center justify-between rounded bg-rose-50 px-2 py-1 border border-rose-200 text-rose-800">
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-rose-600" />
                MockUSDC.approve
              </span>
              <span className="font-bold text-rose-700">BLOCKED (0x095ea7b3)</span>
            </div>
          </div>
        </div>

        {onOpenFirewallModal && (
          <button
            onClick={onOpenFirewallModal}
            className="w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
            <span>Inspect 2-Stage Firewall & Guardrails Matrix</span>
          </button>
        )}
      </div>
    </div>
  );
};
