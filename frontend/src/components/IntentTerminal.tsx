import React, { useState } from "react";
import {
  IntentParseAndSimulateResponse,
} from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  Sparkles,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface IntentTerminalProps {
  onEscrowCreated: () => void;
}

const PRESET_CHIPS = [
  {
    title: "Preset 1 (Milestone Escrow — Happy Path)",
    prompt:
      "Lock 1,200 USDC in milestone escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve.",
  },
  {
    title: "Preset 2 (Direct Payment — Low Amount)",
    prompt: "Transfer 350 USDC to DevStudio for UI design sprint.",
  },
];

export const IntentTerminal: React.FC<IntentTerminalProps> = ({
  onEscrowCreated,
}) => {
  const [prompt, setPrompt] = useState<string>(PRESET_CHIPS[0].prompt);
  const [loadingSim, setLoadingSim] = useState<boolean>(false);
  const [loadingExec, setLoadingExec] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<IntentParseAndSimulateResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!prompt.trim()) return;
    try {
      setLoadingSim(true);
      setErrorBanner(null);
      const res = await apiClient.parseAndSimulate(prompt, false);
      setSimResult(res);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSim(false);
    }
  };

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    try {
      setLoadingExec(true);
      setErrorBanner(null);
      const res = await apiClient.parseAndSimulate(prompt, true);
      setSimResult(res);
      if (res.executed) {
        onEscrowCreated();
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingExec(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Natural-Language Commercial Intent Terminal
            </h2>
            <p className="text-xs text-slate-500">
              Perception & Intent Parsing with 2-Stage Pre-Execution Guardrails
            </p>
          </div>
        </div>

        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200">
          Agent Runtime v1.0
        </span>
      </div>

      {/* Preset Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESET_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setPrompt(chip.prompt);
              setSimResult(null);
              setErrorBanner(null);
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium text-left transition-colors ${
              prompt === chip.prompt
                ? "border-blue-700 bg-blue-50/80 text-blue-800"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="font-semibold block">{chip.title}</span>
            <span className="text-[11px] opacity-80 truncate max-w-xs block">
              {chip.prompt}
            </span>
          </button>
        ))}
      </div>

      {/* Textarea Input */}
      <div className="mt-3">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter commercial instruction (e.g. Lock 1,200 USDC in escrow for DevStudio...)"
          className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSimulate}
          disabled={loadingSim || loadingExec || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <ShieldCheck
            className={`h-4 w-4 text-blue-700 ${loadingSim ? "animate-spin" : ""}`}
          />
          <span>{loadingSim ? "Simulating EVM..." : "1. Simulate & Inspect Firewall (Dry-Run)"}</span>
        </button>

        <button
          onClick={handleExecute}
          disabled={loadingSim || loadingExec || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:opacity-50"
        >
          <Send
            className={`h-4 w-4 text-white ${loadingExec ? "animate-spin" : ""}`}
          />
          <span>{loadingExec ? "Signing via Session Key..." : "2. Authorize & Execute via Session Key"}</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-semibold">Execution Blocked:</span> {errorBanner}
          </div>
        </div>
      )}

      {/* Success Execution Banner */}
      {simResult?.executed && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              On-Chain Transaction Confirmed & Escrow Funded!
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-800">
              Escrow #{simResult.escrow?.escrow_id ?? "New"}
            </span>
          </div>
          {simResult.tx_hash && (
            <p className="mt-1 font-mono text-[11px] text-emerald-800 break-all">
              Tx Hash: {simResult.tx_hash}
            </p>
          )}
        </div>
      )}

      {/* 2-Stage Firewall Report Preview */}
      {simResult && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                2-Stage Pre-Execution Inspection Report
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  simResult.firewall.overall_approved
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {simResult.firewall.overall_approved ? "VERDICT: APPROVED" : "VERDICT: REJECTED"}
              </span>
            </div>

            <span className="font-mono text-[11px] text-slate-500">
              Gas Est: ~{simResult.firewall.estimated_gas.toLocaleString()}
            </span>
          </div>

          {/* Structured Intent Summary */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded bg-white p-2 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase">Action</span>
              <span className="font-semibold text-slate-900 font-mono">
                {simResult.parsed_intent.action_type}
              </span>
            </div>
            <div className="rounded bg-white p-2 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase">Amount</span>
              <span className="font-semibold text-slate-900 font-mono">
                ${simResult.parsed_intent.amount_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="rounded bg-white p-2 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase">Tax Reserve</span>
              <span className="font-semibold text-slate-900 font-mono">
                {simResult.parsed_intent.tax_withholding_bps / 100}%
              </span>
            </div>
            <div className="rounded bg-white p-2 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase">Counterparty</span>
              <span className="font-semibold text-slate-900 truncate block">
                {simResult.parsed_intent.recipient_label}
              </span>
            </div>
          </div>

          {/* Stage 1 Checks */}
          <div className="mt-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Stage 1: Off-Chain Policy Guardrails (5/5 Checks)
            </span>
            <div className="space-y-1.5">
              {simResult.firewall.stage1_checks.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between rounded bg-white px-2.5 py-1.5 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {c.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium text-slate-800">{c.check_name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono ml-2 text-right">
                    {c.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2 EVM Simulation Preview */}
          <div className="mt-3 border-t border-slate-200 pt-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Stage 2: Live EVM eth_call Simulation
            </span>
            <div className="flex items-center justify-between rounded bg-white p-2.5 border border-slate-200 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold ${
                    simResult.firewall.evm_simulation_status === "SUCCESS"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {simResult.firewall.evm_simulation_status}
                </span>
                {simResult.firewall.evm_revert_reason && (
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-800 border border-rose-200">
                    {simResult.firewall.evm_revert_reason}
                  </span>
                )}
              </div>

              <div className="text-slate-600">
                Treasury: ${simResult.firewall.vault_balance_before_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} →{" "}
                <span className="font-bold text-slate-900">
                  ${simResult.firewall.vault_balance_after_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
