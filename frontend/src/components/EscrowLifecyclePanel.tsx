import React, { useState } from "react";
import { EscrowItemDTO, VerifyWebhookResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface EscrowLifecyclePanelProps {
  escrows: EscrowItemDTO[];
  loading?: boolean;
  onSettled: () => void;
}

export const EscrowLifecyclePanel: React.FC<EscrowLifecyclePanelProps> = ({
  escrows,
  onSettled,
}) => {
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [failingWarning, setFailingWarning] = useState<string | null>(null);
  const [settledResult, setSettledResult] = useState<VerifyWebhookResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSimulateWebhook = async (escrowId: number, testsPassed: boolean) => {
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
          "Agent refused settlement: CI verification failed (3 failing tests). Funds remain locked in escrow."
        );
      } else {
        setSettledResult(res);
        onSettled();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setTriggeringId(null);
    }
  };

  const formatHash = (hash?: string) => {
    if (!hash || hash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return "Pending Verification Proof";
    }
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <GitPullRequest className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Autonomous Delivery Perception & Milestone Escrows
            </h2>
            <p className="text-xs text-slate-500">
              Milestone Escrow contracts settled upon cryptographic delivery attestation proofs
            </p>
          </div>
        </div>

        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200">
          {escrows.length} {escrows.length === 1 ? "Agreement" : "Agreements"}
        </span>
      </div>

      {/* Warnings & Result Banners */}
      {errorMessage && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {failingWarning && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold block">Settlement Blocked:</span>
            {failingWarning}
          </div>
        </div>
      )}

      {settledResult && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950 animate-fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Autonomous Settlement Verified On-Chain!</span>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="rounded bg-white p-2 border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Net Payout to DevStudio (85%)</span>
              <span className="font-bold text-emerald-700 text-sm">
                +${settledResult.contractor_payout_usdc?.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="rounded bg-white p-2 border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Tax Withheld to Reserve (15%)</span>
              <span className="font-bold text-amber-700 text-sm">
                +${settledResult.tax_withheld_usdc?.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
          </div>
          {settledResult.attestation_hash && (
            <p className="mt-2 text-[11px] font-mono text-slate-600 break-all">
              SHA-256 Attestation: {settledResult.attestation_hash}
            </p>
          )}
        </div>
      )}

      {/* Escrow List */}
      <div className="mt-4 space-y-4">
        {escrows.map((item) => {
          const isFunded = item.status === "FUNDED";
          const isTriggering = triggeringId === item.escrow_id;

          return (
            <div
              key={item.escrow_id}
              className={`rounded-xl border p-4 transition-all ${
                isFunded
                  ? "border-amber-200 bg-amber-50/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Escrow Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    Escrow #{item.escrow_id}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      isFunded
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                    {item.contractor_label}
                  </span>
                </div>

                <div className="font-mono text-base font-bold text-slate-900 tabular-nums">
                  ${item.total_amount_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </div>
              </div>

              {/* Description */}
              <p className="mt-2.5 text-xs text-slate-700 font-medium">
                "{item.description}"
              </p>

              {/* Financial Split Breakdown */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Contractor Net (85%)</span>
                    <span className="font-mono font-medium text-emerald-700">Payout</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    ${item.estimated_contractor_payout_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Tax Withholding ({item.tax_withholding_bps / 100}%)</span>
                    <span className="font-mono font-medium text-amber-700">Reserve</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    ${item.estimated_tax_reserve_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                  </span>
                </div>
              </div>

              {/* Hashes & Metadata */}
              <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Spec Hash:</span>
                  <span className="text-slate-600 truncate max-w-xs">{formatHash(item.deliverable_spec_hash)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Attestation:</span>
                  <span className="text-slate-600 truncate max-w-xs">{formatHash(item.attestation_hash)}</span>
                </div>
              </div>

              {/* Webhook Action Triggers (Visible for FUNDED Escrows) */}
              {isFunded && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Autonomous Trigger Simulation
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      [Simulated External Webhook Trigger]
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Passing Webhook Button */}
                    <button
                      onClick={() => handleSimulateWebhook(item.escrow_id, true)}
                      disabled={isTriggering}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      title="Trigger GitHub Actions completed webhook with 42/42 tests passing"
                    >
                      <CheckCircle2 className={`h-3.5 w-3.5 ${isTriggering ? "animate-spin" : ""}`} />
                      <span>Simulate Passing GitHub CI Webhook (42/42 Tests)</span>
                    </button>

                    {/* Failing Webhook Button */}
                    <button
                      onClick={() => handleSimulateWebhook(item.escrow_id, false)}
                      disabled={isTriggering}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      title="Simulate failing CI run with 3 failing tests"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>Failing CI Webhook (3 Failed)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
