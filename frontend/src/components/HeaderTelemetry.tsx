import React, { useState } from "react";
import { VaultStateResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import {
  Shield,
  Landmark,
  ShieldCheck,
  Lock,
  Wallet,
  RotateCcw,
  Check,
  Copy,
} from "lucide-react";

interface HeaderTelemetryProps {
  vault: VaultStateResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  vault,
  loading,
  onRefresh,
}) => {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      setResetMessage(null);
      await apiClient.resetDemoState();
      setResetMessage("Sandbox successfully reset to initial seed state!");
      onRefresh();
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: unknown) {
      alert("Reset failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return "0x000...0000";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <header className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Brand & Mission Badges */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
              <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  AegisPay
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60">
                    Topic F: Agent Wallet
                  </span>
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Guardrails Enforced
                </span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 border border-slate-700">
                  ERC-4337 Smart Account
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Autonomous Smart Treasury & Delivery Escrow Wallet</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-blue-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">
                  [Testnet / Anvil Sandbox — MockUSDC]
                </span>
              </p>
            </div>
          </div>

          {/* Network Info & Reset Button */}
          <div className="flex flex-wrap items-center gap-3">
            {resetMessage && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 animate-fade-in">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {resetMessage}
              </span>
            )}

            {/* Live Vault Account Pill */}
            {vault?.vault_address && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-mono text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Vault:</span>
                <span>{formatAddress(vault.vault_address)}</span>
                <button
                  onClick={() => copyToClipboard(vault.vault_address, "vault")}
                  className="text-slate-400 hover:text-white"
                  title="Copy Vault Address"
                >
                  {copied === "vault" ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}

            {/* Reset Demo Button */}
            <button
              onClick={handleResetDemo}
              disabled={resetting || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white disabled:opacity-50"
              title="Reset chain state and demo escrows to initial seed"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 text-blue-400 ${resetting ? "animate-spin" : ""}`}
              />
              <span>{resetting ? "Resetting Sandbox..." : "Reset Demo State"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Vault Custody */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Vault Custody
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              ${vault ? vault.total_balance_usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "24,200.00"}
            </span>
            <span className="ml-1.5 text-xs font-medium text-slate-500">mUSDC</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>On-chain treasury assets</span>
            <span className="font-mono text-[11px] text-slate-400">Chain: 31337</span>
          </p>
        </div>

        {/* KPI 2: Available Operating Balance */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Available Operating Balance
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
              ${vault ? vault.operating_balance_usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "24,080.00"}
            </span>
            <span className="ml-1.5 text-xs font-medium text-slate-500">mUSDC</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Spendable by AI Agent within policy</span>
            <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
              Unrestricted
            </span>
          </p>
        </div>

        {/* KPI 3: Locked Tax Reserve */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Locked Tax Reserve
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
              ${vault ? vault.tax_reserve_balance_usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "120.00"}
            </span>
            <span className="ml-1.5 text-xs font-medium text-slate-500">mUSDC</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Isolated sub-account (15% per tx)</span>
            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
              Agent Inaccessible
            </span>
          </p>
        </div>

        {/* KPI 4: Contractor Balance */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              DevStudio Balance
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              ${vault ? vault.contractor_balance_usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "680.00"}
            </span>
            <span className="ml-1.5 text-xs font-medium text-slate-500">mUSDC</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Whitelisted Contractor (0x3C44...93BC)</span>
            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
              Verified
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
