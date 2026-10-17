import React, { useState } from "react";
import { EscrowItem, WebhookSettlementResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  GitPullRequest,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface EscrowLifecyclePanelProps {
  escrows: EscrowItem[];
  loading?: boolean;
  onSettled: () => void;
}

export const EscrowLifecyclePanel: React.FC<EscrowLifecyclePanelProps> = ({
  escrows,
  onSettled,
}) => {
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [settlementResult, setSettlementResult] = useState<WebhookSettlementResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSimulateWebhook = async (escrowId: string, status: "success" | "failure") => {
    try {
      setTriggeringId(escrowId);
      setErrorMessage(null);
      setSettlementResult(null);

      const res = await apiClient.triggerGithubWebhook({
        event: "workflow_run.completed",
        repository: "AegisPay/smart-treasury-suite",
        branch: "main",
        commit_sha: "4a9f3b18c72e9d0e",
        status,
        run_id: "94827103",
        escrow_id: escrowId,
      });

      setSettlementResult(res);
      onSettled();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setTriggeringId(null);
    }
  };

  const formatHash = (hash?: string) => {
    if (!hash) return "";
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <GitPullRequest className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Autonomous Perception & Milestone Escrows
              <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/60">
                GitHub CI/CD Verifier
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Contract milestones automatically settled upon external proof attestation verification
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Total Escrows: {escrows.length}
        </span>
      </div>

      {/* Settlement Success Banner */}
      {settlementResult && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 animate-fade-in shadow-lg shadow-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Autonomous Perception Settlement Complete!
            </div>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
              Tx: {formatHash(settlementResult.tx_hash)}
            </span>
          </div>

          <p className="mt-1 text-slate-300">
            {settlementResult.verification_summary}
          </p>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="rounded bg-slate-900/80 p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Contractor Disbursed (85%)</span>
              <span className="font-bold text-emerald-400">
                +${settlementResult.contractor_payout_usdc.toLocaleString()} USDC
              </span>
            </div>

            <div className="rounded bg-slate-900/80 p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Tax Reserve Remitted (15%)</span>
              <span className="font-bold text-amber-400">
                +${settlementResult.tax_withheld_usdc.toLocaleString()} USDC
              </span>
            </div>

            <div className="rounded bg-slate-900/80 p-2 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px]">Verified Proof</span>
              <span className="text-cyan-300 truncate block">
                {formatHash(settlementResult.attestation_hash)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Webhook Error: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Escrow Items List */}
      <div className="mt-4 space-y-3">
        {escrows.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
            No active escrows found. Submit an agreement above to create the first milestone escrow.
          </div>
        ) : (
          escrows.map((escrow) => {
            const isCreated = escrow.status === "Created";
            const isSettled = escrow.status === "Settled";
            const isBusy = triggeringId === escrow.escrow_id;

            return (
              <div
                key={escrow.escrow_id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700"
              >
                {/* Item Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white">
                      Escrow: {formatHash(escrow.escrow_id)}
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="font-mono text-xs text-cyan-300">
                      DevStudio (0x3C44...93BC)
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCreated ? (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Awaiting CI/CD Perception Webhook
                      </span>
                    ) : isSettled ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        Settled & Disbursed
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                        {escrow.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount & Split Breakdown */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Total Locked</span>
                    <p className="font-mono font-bold text-white text-sm">
                      ${escrow.amount_usdc.toLocaleString()} USDC
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Contractor Payout (85%)</span>
                    <p className="font-mono font-bold text-emerald-400 text-sm">
                      ${escrow.contractor_payout_usdc.toLocaleString()} USDC
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Tax Reserve (15%)</span>
                    <p className="font-mono font-bold text-amber-400 text-sm">
                      ${escrow.tax_amount_usdc.toLocaleString()} USDC
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Delivery Verification</span>
                    <p className="text-slate-300 text-xs truncate">
                      GitHub Actions CI/CD
                    </p>
                  </div>
                </div>

                {/* Simulated Trigger Actions */}
                {isCreated && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 font-mono text-[11px]">
                      Expected Proof: {formatHash(escrow.attestation_hash)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSimulateWebhook(escrow.escrow_id, "failure")}
                        disabled={isBusy}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-[11px]"
                        title="Simulate CI build failure to verify rejection"
                      >
                        Simulate CI Failure
                      </button>

                      <button
                        onClick={() => handleSimulateWebhook(escrow.escrow_id, "success")}
                        disabled={isBusy}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-black shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50"
                      >
                        {isBusy ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                            <span>Verifying & Settling...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>[Simulated Webhook Trigger] Trigger GitHub CI/CD Pass</span>
                          </>
                        )}
                      </button>
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
