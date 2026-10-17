import React, { useEffect, useState } from "react";
import { FirewallRule } from "../types/api";
import { apiClient } from "../services/apiClient";
import { ShieldAlert, X, CheckCircle2 } from "lucide-react";

interface FirewallInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirewallInspectorModal: React.FC<FirewallInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiClient
        .getFirewallRules()
        .then((res) => setRules(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#0d1322] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-[#121929]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Off-Chain Firewall & On-Chain Guardrails Inspector
                <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800">
                  Defense-in-Depth
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Dual-layer verification architecture preventing rogue, hallucinated, or injected transactions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">Architectural Philosophy:</span> AegisPay strictly decouples AI probabilistic reasoning from financial execution. The agent never possesses private key autonomy over funds; all state mutations are gated by both an off-chain pre-simulation policy engine and deterministic Solidity smart account rules.
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Loading firewall rules...
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-800 bg-[#121929] p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                        {rule.id}
                      </span>
                      <h4 className="text-xs font-bold text-white">
                        {rule.name}
                      </h4>
                    </div>

                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Active Enforcement
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {rule.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
                    <span>Category: {rule.category}</span>
                    <span className="text-slate-400">Enforcement: {rule.enforcement_layer}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 bg-[#121929] flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
