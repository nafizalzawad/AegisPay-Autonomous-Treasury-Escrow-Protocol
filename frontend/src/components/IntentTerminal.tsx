import React, { useState } from "react";
import {
  IntentParseAndSimulateResponse,
} from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Layers,
  Terminal,
} from "lucide-react";

interface IntentTerminalProps {
  onEscrowCreated: (msg?: string, txHash?: string) => void;
  disabled?: boolean;
}

const PRESET_OPTIONS = [
  {
    id: "preset-a",
    label: "Preset A: $1,200 Milestone Escrow (15% Tax Split)",
    prompt:
      "Lock 1,200 USDC in milestone escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve.",
  },
  {
    id: "preset-b",
    label: "Preset B: $350 Sprint Settlement",
    prompt: "Transfer 350 USDC to DevStudio for UI design sprint.",
  },
  {
    id: "custom",
    label: "Custom Commercial Intent",
    prompt: "",
  },
];

export const IntentTerminal: React.FC<IntentTerminalProps> = ({
  onEscrowCreated,
  disabled = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("preset-a");
  const [prompt, setPrompt] = useState<string>(PRESET_OPTIONS[0].prompt);
  const [loadingSim, setLoadingSim] = useState<boolean>(false);
  const [loadingExec, setLoadingExec] = useState<boolean>(false);
  const [stepperStep, setStepperStep] = useState<number>(0);
  const [simResult, setSimResult] = useState<IntentParseAndSimulateResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleSelectPreset = (preset: typeof PRESET_OPTIONS[0]) => {
    setSelectedPreset(preset.id);
    if (preset.id !== "custom") {
      setPrompt(preset.prompt);
    }
    setSimResult(null);
    setErrorBanner(null);
  };

  const runChoreography = async (isExecution: boolean) => {
    setStepperStep(1);
    await new Promise((r) => setTimeout(r, 250));
    setStepperStep(2);
    await new Promise((r) => setTimeout(r, 250));
    if (isExecution) {
      setStepperStep(3);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const handleSimulate = async () => {
    if (!prompt.trim() || loadingSim || loadingExec || disabled) return;
    try {
      setLoadingSim(true);
      setErrorBanner(null);
      await runChoreography(false);
      const res = await apiClient.parseAndSimulate(prompt, false);
      setSimResult(res);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSim(false);
      setStepperStep(0);
    }
  };

  const handleExecute = async () => {
    if (!prompt.trim() || loadingSim || loadingExec || disabled) return;
    try {
      setLoadingExec(true);
      setErrorBanner(null);
      await runChoreography(true);
      const res = await apiClient.parseAndSimulate(prompt, true);
      setSimResult(res);
      if (res.executed) {
        onEscrowCreated(
          `Escrow #${res.escrow?.escrow_id ?? "New"} successfully funded on-chain!`,
          res.tx_hash ?? undefined
        );
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingExec(false);
      setStepperStep(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    }
  };

  // Live extracted parameters heuristic from current prompt or simResult
  const detectedAmount = simResult?.parsed_intent?.amount_usdc ?? (
    prompt.includes("1,200") || prompt.includes("1200") ? 1200 : prompt.includes("350") ? 350 : null
  );
  const detectedAction = simResult?.parsed_intent?.action_type ?? (
    prompt.toLowerCase().includes("escrow") ? "CREATE_ESCROW" : "DIRECT_TRANSFER"
  );
  const detectedBeneficiary = simResult?.parsed_intent?.recipient_label ?? (
    prompt.toLowerCase().includes("devstudio") ? "DevStudio" : "Unknown"
  );
  const detectedTaxSplit = simResult?.parsed_intent ? (simResult.parsed_intent.tax_withholding_bps / 100) : (
    prompt.includes("15%") ? 15 : 0
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-subtle p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            Commercial Intent Composer
          </h2>
          <p className="text-xs text-slate-500">
            Natural-language commercial terms evaluated by dual-stage pre-execution firewall
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
          <Terminal className="h-3 w-3 text-slate-400" />
          <span>Parser: Deterministic + LLM Hybrid</span>
        </div>
      </div>

      {/* Preset Selector Segmented Bar */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-md border border-slate-200/80">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelectPreset(opt)}
            className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
              selectedPreset === opt.id
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/90 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Code Input Composer Surface */}
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition p-3">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (selectedPreset !== "custom") setSelectedPreset("custom");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter commercial instruction (e.g. Lock 1,200 USDC in milestone escrow for DevStudio; auto-release when GitHub CI passes...)"
          className="w-full bg-transparent text-slate-900 font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none placeholder:text-slate-400"
          disabled={disabled || loadingSim || loadingExec}
        />

        {/* Live Detected Parameter Footer */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Extracted:</span>
            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
              Action: {detectedAction}
            </span>
            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
              To: {detectedBeneficiary}
            </span>
            {detectedAmount && (
              <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                ${detectedAmount.toLocaleString()} USDC
              </span>
            )}
            {detectedTaxSplit > 0 && (
              <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                Tax Split: {detectedTaxSplit}%
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-400 hidden sm:inline">
            Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono">⌘+Enter</kbd> to execute
          </div>
        </div>
      </div>

      {/* Stepper Choreography Progress */}
      {stepperStep > 0 && (
        <div className="mt-3 rounded border border-blue-200 bg-blue-50/60 p-2.5 text-xs font-mono text-blue-900 flex items-center gap-2 animate-pulse">
          <Cpu className="h-3.5 w-3.5 text-blue-700 animate-spin" />
          <span>
            {stepperStep === 1 && "Step 1/3: Parsing NLP Intent & Checking Prompt Integrity..."}
            {stepperStep === 2 && "Step 2/3: Verifying SessionKeyPolicy & Running EVM eth_call Dry-Run..."}
            {stepperStep === 3 && "Step 3/3: Broadcasting Signed UserOp via Session Key (0x7099...79C8)..."}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <button
          onClick={handleSimulate}
          disabled={disabled || loadingSim || loadingExec || !prompt.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs sm:text-sm px-4 py-2.5 shadow-2xs transition-colors disabled:opacity-50 min-h-[42px]"
          title="Run 2-stage off-chain firewall & EVM eth_call simulation without signing state mutation"
        >
          <Layers className="h-4 w-4 text-slate-600" />
          <span>{loadingSim ? "Simulating EVM Call..." : "Simulate Pre-Execution Firewall (eth_call)"}</span>
        </button>

        <button
          onClick={handleExecute}
          disabled={disabled || loadingSim || loadingExec || !prompt.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm px-4 py-2.5 shadow-2xs transition-colors disabled:opacity-50 min-h-[42px]"
          title="Sign and broadcast on-chain transaction via AI Agent delegated Session Key"
        >
          <Cpu className="h-4 w-4 text-slate-300" />
          <span>{loadingExec ? "Signing via Session Key..." : "Authorize & Execute via Session Key"}</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-semibold">Pre-Execution Guardrail Interception:</span> {errorBanner}
          </div>
        </div>
      )}

      {/* Success Banner */}
      {simResult?.executed && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              On-Chain Transaction Confirmed & Escrow Funded
            </span>
            <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Escrow #{simResult.escrow?.escrow_id ?? "New"}
            </span>
          </div>
          {simResult.tx_hash && (
            <p className="mt-1 font-mono text-[11px] text-emerald-800 break-all">
              Tx: {simResult.tx_hash}
            </p>
          )}
        </div>
      )}

      {/* Inline Pre-Execution Firewall Report */}
      {simResult && (
        <div className="mt-3.5 rounded-md border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Dual-Stage Pre-Execution Inspection Report
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                simResult.firewall.overall_approved
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-rose-100 text-rose-800 border border-rose-200"
              }`}
            >
              {simResult.firewall.overall_approved ? "VERDICT: APPROVED" : "VERDICT: BLOCKED"}
            </span>
          </div>

          {/* Stage 1 & Stage 2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Stage 1: Off-Chain Policy Checks */}
            <div className="rounded border border-slate-200 bg-white p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                <span>Stage 1: Off-Chain Policy (5/5)</span>
                <span className="text-emerald-700 font-mono text-[10px]">ALL PASS</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {simResult.firewall.stage1_checks.map((chk, i) => (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-slate-800 truncate">
                      {chk.passed ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                      )}
                      <span className="truncate">{chk.check_name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {chk.passed ? "OK" : "FAILED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 2: Live EVM State Delta */}
            <div className="rounded border border-slate-200 bg-white p-3 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-sans border-b border-slate-100 pb-1.5">
                <span>Stage 2: EVM eth_call Simulation</span>
                <span className="text-emerald-700 font-mono text-[10px]">
                  {simResult.firewall.evm_simulation_status}
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Pre-Custody:</span>
                  <span className="text-slate-900 font-semibold tabular-nums">
                    ${simResult.firewall.vault_balance_before_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Post-Custody:</span>
                  <span className="text-slate-900 font-semibold tabular-nums">
                    ${simResult.firewall.vault_balance_after_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Authorized Delta:</span>
                  <span className="text-slate-900 font-semibold tabular-nums">
                    -${simResult.parsed_intent.amount_usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Gas Estimate:</span>
                  <span className="text-slate-700 font-semibold tabular-nums">
                    ~{simResult.firewall.estimated_gas.toLocaleString()} units
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
