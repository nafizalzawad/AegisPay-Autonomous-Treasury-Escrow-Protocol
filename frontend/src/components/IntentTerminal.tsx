import React, { useState } from "react";
import { ParsedIntent, SimulationResult, IntentExecutionResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  Cpu,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";

interface IntentTerminalProps {
  onEscrowCreated: () => void;
}

const PRESET_INTENTS = [
  {
    label: "Demo Standard (1,200 USDC + 15% Tax)",
    text: "Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve",
  },
  {
    label: "Milestone 2 (800 USDC + 10% Tax)",
    text: "Create milestone escrow for 800 USDC to DevStudio upon CI passing with 10% tax reserve",
  },
  {
    label: "Micro-Grant (500 USDC + 15% Tax)",
    text: "Lock 500 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve",
  },
];

export const IntentTerminal: React.FC<IntentTerminalProps> = ({ onEscrowCreated }) => {
  const [prompt, setPrompt] = useState<string>(PRESET_INTENTS[0].text);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<IntentExecutionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleParseAndSimulate = async () => {
    if (!prompt.trim()) return;
    try {
      setIsParsing(true);
      setErrorMessage(null);
      setExecutionResult(null);

      // Step 1: Parse natural-language intent
      const parsed = await apiClient.parseIntent(prompt);
      setParsedIntent(parsed);

      // Step 2: Pre-execution simulation and firewall validation
      const sim = await apiClient.simulateIntent(parsed);
      setSimulation(sim);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteOnChain = async () => {
    if (!parsedIntent) return;
    try {
      setIsExecuting(true);
      setErrorMessage(null);

      const result = await apiClient.executeIntent(parsedIntent);
      setExecutionResult(result);
      onEscrowCreated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Autonomous Intent Terminal
              <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/60">
                Natural Language ➔ Solidity
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Transform unstructured commercial contracts into deterministic, pre-simulated on-chain escrows
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300 border border-slate-700 items-center gap-1.5 font-mono">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          AI Engine Active
        </span>
      </div>

      {/* Preset Chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Quick Agreement Presets:</span>
        {PRESET_INTENTS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(preset.text);
              setParsedIntent(null);
              setSimulation(null);
              setExecutionResult(null);
            }}
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800 transition-all font-mono text-[11px]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="mt-3 relative">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter commercial intent agreement (e.g., Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve)..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono transition-all resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Off-chain regex & LLM fallback parser with zero-knowledge simulation
          </span>

          <button
            onClick={handleParseAndSimulate}
            disabled={isParsing || !prompt.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-black shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>AI Reasoning & Simulating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Parse & Run Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Execution Blocked: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Reasoning & Simulation Output Cards */}
      {parsedIntent && simulation && (
        <div className="mt-5 space-y-4 animate-fade-in">
          {/* Card 1: Structured Reasoning Breakdown */}
          <div className="rounded-xl border border-cyan-800/40 bg-[#0d172b]/90 p-4">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-cyan-400" />
                Probabilistic AI Reasoning ➔ Structured Intent
              </span>
              <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Confidence: {(parsedIntent.confidence_score * 100).toFixed(0)}%
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Principal Amount</span>
                <p className="mt-1 font-mono text-base font-bold text-white">
                  ${parsedIntent.amount_usdc.toLocaleString()} <span className="text-xs font-normal text-cyan-400">USDC</span>
                </p>
              </div>

              <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Contractor Payout (85%)</span>
                <p className="mt-1 font-mono text-base font-bold text-emerald-400">
                  ${parsedIntent.contractor_payout_usdc.toLocaleString()} <span className="text-xs font-normal">USDC</span>
                </p>
              </div>

              <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Tax Reserve (15%)</span>
                <p className="mt-1 font-mono text-base font-bold text-amber-400">
                  ${parsedIntent.tax_amount_usdc.toLocaleString()} <span className="text-xs font-normal">USDC</span>
                </p>
              </div>

              <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Recipient Whitelist</span>
                <p className="mt-1 font-mono text-xs font-semibold text-cyan-300 truncate">
                  DevStudio [0x3C44...93BC]
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-slate-950/70 p-2.5 border border-slate-800/80 text-[11px] font-mono text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="text-cyan-400 font-semibold">Attestation Proof Hash:</span>
                <span className="truncate">{parsedIntent.expected_attestation_hash}</span>
              </div>
              <span className="shrink-0 text-slate-500">SHA-256 / keccak256</span>
            </div>
          </div>

          {/* Card 2: Pre-Execution Simulation & Safety Checks */}
          <div className="rounded-xl border border-slate-800 bg-[#121929] p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Pre-Execution eth_call Simulation:
                </span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  VERIFIED READY
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Estimated Gas: ~{simulation.gas_estimate.toLocaleString()}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {simulation.checks.map((check, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-900/40">
                  <span className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {check.name}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs text-right">
                    {check.detail}
                  </span>
                </div>
              ))}
            </div>

            {/* Execution Trigger Button */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ready to execute via Agent delegated Session Key
              </span>

              <button
                onClick={handleExecuteOnChain}
                disabled={isExecuting || !simulation.is_valid}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Signing & Locking on Anvil...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Lock {parsedIntent.amount_usdc} USDC in MilestoneEscrow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Confirmation Card */}
      {executionResult && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Escrow Created & Locked Successfully!
          </div>
          <p className="mt-1 text-slate-300 text-xs">
            {executionResult.detail}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px]">
            {executionResult.escrow_id && (
              <span className="rounded bg-slate-900 px-2.5 py-1 text-cyan-300 border border-slate-800">
                Escrow ID: {executionResult.escrow_id.substring(0, 14)}...
              </span>
            )}
            {executionResult.tx_hash && (
              <span className="rounded bg-slate-900 px-2.5 py-1 text-slate-400 border border-slate-800">
                Tx: {executionResult.tx_hash.substring(0, 14)}...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
