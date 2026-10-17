import React from "react";
import { SessionKeyPolicyDTO } from "../types/api";
import { Skeleton } from "./Skeleton";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface PolicyGuardrailCardProps {
  policy: SessionKeyPolicyDTO | null;
  loading?: boolean;
  onOpenFirewallModal?: () => void;
}

export const PolicyGuardrailCard: React.FC<PolicyGuardrailCardProps> = ({
  policy,
  loading = false,
  onOpenFirewallModal,
}) => {
  const maxPerTx = policy?.max_per_tx_usdc ?? 1500;
  const maxDaily = policy?.max_daily_usdc ?? 3000;
  const spentToday = policy?.spent_today_usdc ?? 0;
  const remainingDaily = policy?.remaining_daily_usdc ?? (maxDaily - spentToday);
  const agentKey =
    policy?.session_key_address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const usagePercent = Math.min(100, Math.round((spentToday / maxDaily) * 100));

  const formatAddress = (addr?: string) => {
    if (!addr) return "0x000...0000";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-subtle p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            On-Chain SessionKeyPolicy
          </h3>
          <p className="text-xs font-mono text-slate-500">
            Agent Signer: {formatAddress(agentKey)}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 self-start sm:self-center font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>ACTIVE • ENFORCED</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Row 1: Spending Limits & 24h Rolling Velocity */}
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
                  Per-Transaction Hard Cap
                </span>
                <div className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  ${maxPerTx.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs text-slate-500 font-sans font-normal">USDC</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
                  24h Rolling Cap
                </span>
                <div className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  ${maxDaily.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs text-slate-500 font-sans font-normal">USDC</span>
                </div>
              </div>
            </div>

            {/* Precision Velocity Progress Bar */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                <span>Usage: ${spentToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-slate-800 font-semibold tabular-nums">
                  ${remainingDaily.toLocaleString(undefined, { minimumFractionDigits: 2 })} Remaining
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 rounded-full transition-all duration-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Whitelisted Beneficiaries */}
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>Whitelisted Beneficiary Allowlist</span>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                1 Verified
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium text-slate-900">DevStudio</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                0x3C44...93BC
              </span>
            </div>
          </div>

          {/* Row 3: EVM Function Selector Matrix */}
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <span>EVM Selector Whitelist Matrix</span>
              <span className="font-mono text-[10px] text-slate-600">4 Enforced</span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 border border-slate-200">
                <span className="text-slate-700">MilestoneEscrow.createEscrow</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span>0x0a1d5e6d</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">PERMITTED</span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 border border-slate-200">
                <span className="text-slate-700">MilestoneEscrow.releaseMilestone</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span>0xb20616e0</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">PERMITTED</span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 border border-slate-200">
                <span className="text-slate-700">MockUSDC.transfer</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span>0xa9059cbb</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">PERMITTED</span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded bg-rose-50/80 px-2.5 py-1.5 border border-rose-200 text-rose-900">
                <span className="flex items-center gap-1 font-medium">
                  <XCircle className="h-3 w-3 text-rose-600" />
                  MockUSDC.approve
                </span>
                <span className="text-rose-700 font-bold flex items-center gap-1">
                  <span>0x095ea7b3</span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded">FORBIDDEN</span>
                </span>
              </div>
            </div>
          </div>

          {/* Modal Trigger Button */}
          {onOpenFirewallModal && (
            <button
              onClick={onOpenFirewallModal}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 transition-colors shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
              <span>Inspect 2-Stage Firewall & Guardrails Matrix</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
