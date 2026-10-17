import React, { useState } from "react";
import { EscrowItemDTO, VerifyWebhookResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import { Skeleton } from "./Skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
} from "lucide-react";

interface EscrowLifecyclePanelProps {
  escrows: EscrowItemDTO[];
  loading?: boolean;
  onSettled: (msg?: string, txHash?: string) => void;
  disabled?: boolean;
}

export const EscrowLifecyclePanel: React.FC<EscrowLifecyclePanelProps> = ({
  escrows,
  loading = false,
  onSettled,
  disabled = false,
}) => {
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [failingWarning, setFailingWarning] = useState<string | null>(null);
  const [settledResult, setSettledResult] = useState<VerifyWebhookResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleSimulateWebhook = async (escrowId: number, testsPassed: boolean) => {
    if (disabled || triggeringId !== null) return;
    try {
      setTriggeringId(escrowId);
      setErrorMessage(null);
      setFailingWarning(null);
      setSettledResult(null);

      const res = await apiClient.verifyWebhook({
        escrow_id: escrowId,
        provider: "github_actions",
        repo_or_tracking_id: "AegisPay/smart-treasury-suite",
        commit_sha_or_waybill: "4a9f3b18c72e9d0e",
        tests_passed: testsPassed,
        passed_count: testsPassed ? 42 : 39,
        failed_count: testsPassed ? 0 : 3,
      });

      if (!testsPassed || !res.settled) {
        setFailingWarning(
          "Agent perceptual verification failed: 3/42 tests failed. Settlement blocked; funds protected in escrow."
        );
      } else {
        setSettledResult(res);
        onSettled(
          `Escrow #${escrowId} settled on-chain! Net: +$${res.contractor_payout_usdc?.toLocaleString()} to DevStudio | Tax: +$${res.tax_withheld_usdc?.toLocaleString()} to Reserve`,
          res.tx_hash
        );
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setTriggeringId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatHash = (hash?: string) => {
    if (!hash || hash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return "Pending Delivery Attestation";
    }
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-subtle overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            Milestone Commercial Agreements Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Escrow contracts settled autonomously via cryptographic delivery attestation proofs
          </p>
        </div>

        <span className="font-mono text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded self-start sm:self-center">
          {escrows.length} {escrows.length === 1 ? "Agreement" : "Agreements"}
        </span>
      </div>

      {/* Global Banners */}
      {errorMessage && (
        <div className="m-4 p-3 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {failingWarning && (
        <div className="m-4 p-3 rounded-md border border-amber-300 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold block">Settlement Blocked:</span>
            {failingWarning}
          </div>
        </div>
      )}

      {settledResult && (
        <div className="m-4 p-3.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Autonomous Delivery Settlement Confirmed On-Chain</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-white border border-emerald-200 p-2 rounded">
              <span className="text-slate-500 block text-[10px]">Net Payout to DevStudio (85%)</span>
              <span className="font-bold text-emerald-700 text-sm tabular-nums">
                +${settledResult.contractor_payout_usdc?.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="bg-white border border-emerald-200 p-2 rounded">
              <span className="text-slate-500 block text-[10px]">Automated Tax Withholding (15%)</span>
              <span className="font-bold text-amber-700 text-sm tabular-nums">
                +${settledResult.tax_withheld_usdc?.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
          </div>
          {settledResult.attestation_hash && (
            <p className="font-mono text-[10px] text-slate-600 truncate">
              SHA-256 Proof: {settledResult.attestation_hash}
            </p>
          )}
        </div>
      )}

      {/* Structured Ledger Rows */}
      <div className="divide-y divide-slate-200">
        {loading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-8 w-64" />
          </div>
        ) : escrows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No commercial escrow agreements recorded yet.
          </div>
        ) : (
          escrows.map((item) => {
            const isFunded = item.status === "FUNDED";
            const isSettled = item.status === "SETTLED";
            const isTriggering = triggeringId === item.escrow_id;

            return (
              <div key={item.escrow_id} className="p-4 sm:p-5 space-y-3 transition-colors hover:bg-slate-50/50">
                {/* Top Row: Escrow ID + Status + Beneficiary + Gross Amount */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      ESCROW #{String(item.escrow_id).padStart(2, "0")}
                    </span>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isFunded
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : isSettled
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isFunded ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        }`}
                      />
                      {isFunded ? "FUNDED • AWAITING ATTESTATION" : "SETTLED • ATTESTATION VERIFIED"}
                    </span>

                    <span className="text-xs text-slate-600 font-medium truncate max-w-xs">
                      {item.contractor_label}
                    </span>
                  </div>

                  <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                    ${item.total_amount_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                  </div>
                </div>

                {/* Middle Row: Description */}
                <p className="text-xs text-slate-700 font-medium italic border-l-2 border-slate-300 pl-2.5">
                  "{item.description}"
                </p>

                {/* 3-Column Architectural Metric Split */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-medium">
                      Gross Locked
                    </span>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      ${item.total_amount_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-medium">
                      Net Beneficiary Payout (85%)
                    </span>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      ${item.estimated_contractor_payout_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-medium">
                      Automated Tax Withholding ({item.tax_withholding_bps / 100}%)
                    </span>
                    <span className="font-mono font-semibold text-amber-700 tabular-nums">
                      ${item.estimated_tax_reserve_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                    </span>
                  </div>
                </div>

                {/* Cryptographic Proof Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] font-mono text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400">Spec Hash:</span>
                    <span className="text-slate-700">{formatHash(item.deliverable_spec_hash)}</span>
                    <button
                      onClick={() => copyToClipboard(item.deliverable_spec_hash, `spec-${item.escrow_id}`)}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy Specification Hash"
                    >
                      {copiedHash === `spec-${item.escrow_id}` ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400">CI Attestation SHA-256:</span>
                    <span className="text-slate-700">{formatHash(item.attestation_hash)}</span>
                    {item.attestation_hash &&
                      item.attestation_hash !==
                        "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                        <button
                          onClick={() =>
                            copyToClipboard(item.attestation_hash, `attest-${item.escrow_id}`)
                          }
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy Attestation Hash"
                        >
                          {copiedHash === `attest-${item.escrow_id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                  </div>
                </div>

                {/* Webhook Perception Trigger Controls (Visible for FUNDED Escrows) */}
                {isFunded && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 px-3 py-2.5 rounded-md border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <GitPullRequest className="h-3.5 w-3.5 text-slate-500" />
                        <span>Perceptual Trigger</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          [Simulated Webhook]
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Failing Webhook Button */}
                        <button
                          onClick={() => handleSimulateWebhook(item.escrow_id, false)}
                          disabled={isTriggering || disabled}
                          className="inline-flex items-center justify-center gap-1.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50 min-h-[36px]"
                          title="Simulate failing CI run (3 failed tests) — Agent should refuse settlement"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                          <span>Simulate Failing CI (39/42 Passed)</span>
                        </button>

                        {/* Passing Webhook Button */}
                        <button
                          onClick={() => handleSimulateWebhook(item.escrow_id, true)}
                          disabled={isTriggering || disabled}
                          className="inline-flex items-center justify-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 shadow-2xs transition-colors disabled:opacity-50 min-h-[36px]"
                          title="Simulate GitHub Actions completed webhook with 42/42 tests passing — Agent releases funds"
                        >
                          {isTriggering ? (
                            <Cpu className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isTriggering ? "Verifying & Settling..." : "Simulate Passing GitHub CI (42/42 Passed)"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
