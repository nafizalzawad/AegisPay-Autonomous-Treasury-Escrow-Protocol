import React from "react";
import { SessionKeyPolicyDTO } from "../types/api";
import {
  ShieldAlert,
  ShieldCheck,
  X,
  CheckCircle2,
  Lock,
  Cpu,
} from "lucide-react";

interface FirewallInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy?: SessionKeyPolicyDTO | null;
}

export const FirewallInspectorModal: React.FC<FirewallInspectorModalProps> = ({
  isOpen,
  onClose,
  policy,
}) => {
  if (!isOpen) return null;

  const maxPerTx = policy?.max_per_tx_usdc ?? 1500;
  const maxDaily = policy?.max_daily_usdc ?? 3000;

  const stage1Rules = [
    {
      id: "RULE-01",
      name: "Prompt Injection & Jailbreak Heuristic Shield",
      description: "Detects override instructions, token leakage, or roleplay delimiters before LLM parsing occurs.",
      enforcement: "Zero-Latency Regex & Semantic Classifier",
      status: "ACTIVE",
    },
    {
      id: "RULE-02",
      name: "Per-Transaction Value Ceiling",
      description: `Disallows single transaction proposals exceeding $${maxPerTx.toLocaleString()} USDC limit.`,
      enforcement: "Static Policy Evaluator",
      status: "ACTIVE",
    },
    {
      id: "RULE-03",
      name: "24-Hour Rolling Spend Velocity Budget",
      description: `Enforces rolling 24h cumulative budget capped at $${maxDaily.toLocaleString()} USDC.`,
      enforcement: "On-Chain State Synchronization",
      status: "ACTIVE",
    },
    {
      id: "RULE-04",
      name: "Strict Counterparty Whitelist Verification",
      description: "Only pre-verified institutional vendor addresses (e.g. DevStudio) are authorized to receive funds.",
      enforcement: "Cryptographic Recipient Allowlist",
      status: "ACTIVE",
    },
    {
      id: "RULE-05",
      name: "Allowed Function Selector Strict Filter",
      description: "Permits only createEscrow, releaseMilestone, and transfer. Blocks approve(spender, MAX_UINT256).",
      enforcement: "Calldata 4-Byte Selector Matcher",
      status: "ACTIVE",
    },
  ];

  const stage2Specs = [
    {
      title: "EVM State-Fork Simulation (eth_call)",
      description: "Executes the raw encoded transaction against the current block state in a sandboxed EVM without spending gas.",
    },
    {
      title: "Zero-Balance-Loss Verification",
      description: "Computes exact delta: if balance drop > authorized amount or unexpected recipient gains tokens, transaction aborts.",
    },
    {
      title: "Solidity Custom Error Trapping",
      description: "Captures 4-byte custom error selectors (e.g., 0x06951c29 PerTxSpendLimitExceeded) to provide deterministic proof.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-xs">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                2-Stage Pre-Execution Firewall & Solidity Guardrails
                <span className="rounded bg-blue-900/80 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-700">
                  Institutional Architecture
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Defense-in-depth decoupling probabilistic AI parsing from deterministic on-chain settlement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700">
          {/* Architectural Banner */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-950">
            <span className="font-bold text-blue-900">Decoupled AI & Financial Integrity: </span>
            The AI Agent possesses zero direct private key custody over treasury assets. Every intent is first validated by an off-chain 5-point firewall, dry-run simulated via EVM <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">eth_call</code>, and finally constrained by immutable smart contract logic in <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">AegisVault.sol</code>.
          </div>

          {/* Stage 1 Section */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Stage 1: Off-Chain Pre-Execution Guardrails (5 Static Checks)
                </h4>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                OFF-CHAIN ENGINE
              </span>
            </div>

            <div className="space-y-2.5">
              {stage1Rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {rule.id}
                      </span>
                      <span className="font-bold text-slate-900">{rule.name}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {rule.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600 text-[11px]">{rule.description}</p>
                  <div className="mt-2 text-[10px] font-mono text-slate-400">
                    Enforcement: <span className="text-slate-600 font-semibold">{rule.enforcement}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2 Section */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Stage 2: Live EVM State-Fork Sandbox Simulation
                </h4>
              </div>
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                SANDBOX SIMULATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stage2Specs.map((spec, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs"
                >
                  <span className="font-bold text-slate-900 block mb-1">{spec.title}</span>
                  <p className="text-[11px] text-slate-600">{spec.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3 On-Chain Solidity Section */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  On-Chain Enforcement: Deterministic Solidity Reverts
                </h4>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                AEGISVAULT.SOL
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-200 p-3 font-mono text-xs">
              <div className="text-slate-400 text-[10px] uppercase mb-1">Custom Error Enforcements:</div>
              <div className="space-y-1 text-[11px]">
                <div>• <span className="text-rose-400">error PerTxSpendLimitExceeded(uint256 requested, uint256 maxAllowed);</span></div>
                <div>• <span className="text-rose-400">error DailySpendLimitExceeded(uint256 requested, uint256 available);</span></div>
                <div>• <span className="text-rose-400">error RecipientNotWhitelisted(address recipient);</span></div>
                <div>• <span className="text-rose-400">error FunctionSelectorNotAllowed(bytes4 selector);</span></div>
                <div>• <span className="text-emerald-400">error PolicyExpired(uint256 expiresAt, uint256 currentTimestamp);</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
