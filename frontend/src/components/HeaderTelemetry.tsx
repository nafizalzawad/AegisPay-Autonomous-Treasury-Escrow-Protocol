import React, { useState } from "react";
import { VaultStatus } from "../types/api";
import { apiClient } from "../services/apiClient";
import { Shield, Coins, Sparkles, RefreshCw, KeyRound, Copy, Check } from "lucide-react";

interface HeaderTelemetryProps {
  vault: VaultStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  vault,
  loading,
  onRefresh,
}) => {
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [faucetSuccess, setFaucetSuccess] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFaucet = async () => {
    if (!vault?.vault_address) return;
    try {
      setFaucetLoading(true);
      setFaucetSuccess(null);
      await apiClient.requestFaucet(vault.vault_address, 1000);
      setFaucetSuccess("Dispensed 1,000 MockUSDC to Treasury!");
      onRefresh();
      setTimeout(() => setFaucetSuccess(null), 4000);
    } catch (err: unknown) {
      alert("Faucet failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFaucetLoading(false);
    }
  };

  const formatAddr = (addr?: string) => {
    if (!addr) return "0x000...0000";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="border-b border-slate-800 bg-[#0d1322] px-6 py-4">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Branding & Status */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Shield className="h-7 w-7 text-black" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0d1322]">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AegisPay
                <span className="rounded-md bg-cyan-950/80 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800/60">
                  Topic F: Agent Wallet
                </span>
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Guardrails Active
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Autonomous On-Chain Smart Treasury & Milestone Escrow</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-cyan-300/80 bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px] border border-slate-800">
                [Testnet / Anvil Sandbox — MockUSDC]
              </span>
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Faucet Notification */}
          {faucetSuccess && (
            <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 font-medium animate-fade-in flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              {faucetSuccess}
            </span>
          )}

          {/* Faucet Button */}
          <button
            onClick={handleFaucet}
            disabled={faucetLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300 disabled:opacity-50"
            title="Mint 1,000 MockUSDC to Treasury"
          >
            <Coins className={`h-3.5 w-3.5 text-cyan-400 ${faucetLoading ? "animate-spin" : ""}`} />
            <span>{faucetLoading ? "Dispensing..." : "+1,000 MockUSDC Faucet"}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 px-2.5 py-1.5 text-xs text-slate-300 transition-all disabled:opacity-50"
            title="Refresh State"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Telemetry Metric Ribbons */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Treasury Balance */}
        <div className="rounded-xl border border-slate-800 bg-[#121929] p-3.5 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-cyan-400" />
              Treasury Liquidity
            </span>
            <span className="font-mono text-[11px] text-slate-500">MockUSDC</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {vault ? vault.usdc_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "100,000.00"}
            </span>
            <span className="text-xs font-semibold text-cyan-400">USDC</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Vault: {formatAddr(vault?.vault_address)}</span>
            <button
              onClick={() => copyToClipboard(vault?.vault_address || "", "vault")}
              className="hover:text-cyan-300"
            >
              {copied === "vault" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Metric 2: Tax Reserve Balance */}
        <div className="rounded-xl border border-slate-800 bg-[#121929] p-3.5 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              Tax Reserve Vault
            </span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
              15.00% Withheld
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-amber-300">
              {vault ? vault.tax_reserve_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "180.00"}
            </span>
            <span className="text-xs font-semibold text-amber-400">USDC</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Sub-account isolation for tax authority remittance
          </p>
        </div>

        {/* Metric 3: AI Agent Session Key */}
        <div className="rounded-xl border border-slate-800 bg-[#121929] p-3.5 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              Agent Session Key
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              Delegated
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-slate-200">
              {formatAddr(vault?.policy.agent)}
            </span>
            <button
              onClick={() => copyToClipboard(vault?.policy.agent || "", "agent")}
              className="text-slate-400 hover:text-cyan-300"
            >
              {copied === "agent" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Spending Limits Active</span>
            <span className="font-semibold text-emerald-400">No Key Exposure</span>
          </div>
        </div>

        {/* Metric 4: Chain Telemetry */}
        <div className="rounded-xl border border-slate-800 bg-[#121929] p-3.5 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Execution Layer
            </span>
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Zero Latency
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold tracking-tight text-white">
              Anvil Localchain
            </span>
            <span className="font-mono text-xs text-slate-400">#31337</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Solidity 0.8.24 CEI</span>
            <span className="text-emerald-400 font-mono">100% Deterministic</span>
          </div>
        </div>
      </div>
    </header>
  );
};
