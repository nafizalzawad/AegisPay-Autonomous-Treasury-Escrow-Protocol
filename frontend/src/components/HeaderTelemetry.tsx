import React, { useState, useEffect } from "react";
import { VaultStateResponse, HealthResponse } from "../types/api";
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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  FileText,
  GitPullRequest,
  Flame,
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
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendLive, setBackendLive] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Poll system health every 5 seconds
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await apiClient.getHealth();
        if (mounted) {
          setHealth(res);
          setBackendLive(res.ok && res.chain_connected);
        }
      } catch {
        if (mounted) {
          setBackendLive(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      setResetMessage(null);
      await apiClient.resetDemoState();
      setResetMessage("Sandbox reset to initial seed state!");
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

  const agentSessionKey = vault?.policy?.session_key_address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  return (
    <div className="space-y-4">
      {/* Reconnection Banner if Backend Unreachable */}
      {!backendLive && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Connecting to AegisPay Backend Relayer... Retrying connection at http://127.0.0.1:8000
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-700">Auto-Reconnecting</span>
        </div>
      )}

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

                {/* Live Health Badge */}
                {backendLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Guardrails Enforced (Chain ID: {health?.chain_id ?? 31337})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                    Relayer Syncing
                  </span>
                )}

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

          {/* Account Pills & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {resetMessage && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 animate-fade-in">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {resetMessage}
              </span>
            )}

            {/* Live Vault Account Pill */}
            {vault?.vault_address && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-mono text-slate-300">
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

            {/* Live Session Key Pill */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-mono text-slate-300">
              <KeyRound className="h-3 w-3 text-cyan-400" />
              <span className="text-slate-400">Agent Key:</span>
              <span>{formatAddress(agentSessionKey)}</span>
              <button
                onClick={() => copyToClipboard(agentSessionKey, "agentKey")}
                className="text-slate-400 hover:text-white"
                title="Copy Agent Session Key Address"
              >
                {copied === "agentKey" ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Demo Quick-Guide Toggle Button */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
              title="Toggle Live Demo Walkthrough Guide"
            >
              <span>Demo Quick-Guide</span>
              {showGuide ? (
                <ChevronUp className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-blue-400" />
              )}
            </button>

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
              <span>{resetting ? "Resetting..." : "Reset Sandbox"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Demo Mode Quick-Guide */}
        {showGuide && (
          <div className="mt-4 pt-4 border-t border-slate-800 animate-fade-in">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                Judging Walkthrough — 3-Step Autonomous Loop
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Topic F: Autonomous On-Chain Agent Wallet
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Step 1 */}
              <div className="rounded-lg bg-slate-800/90 border border-slate-700 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded bg-blue-900 text-blue-300 px-1.5 py-0.5 font-bold font-mono text-[10px]">
                    STEP 1
                  </span>
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-bold text-white">Commercial Intent</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Select Preset 1 in the Terminal. Click <strong>Simulate</strong> to test the 5-point firewall and EVM dry-run, then click <strong>Authorize & Execute</strong> to fund the milestone escrow on-chain.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-lg bg-slate-800/90 border border-slate-700 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded bg-emerald-900 text-emerald-300 px-1.5 py-0.5 font-bold font-mono text-[10px]">
                    STEP 2
                  </span>
                  <GitPullRequest className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-bold text-white">Perception & Settlement</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Click <strong>Simulate Passing GitHub CI Webhook</strong>. The Agent computes a SHA-256 attestation, signs settlement via Session Key, releases 85% ($1,020) to DevStudio, and isolates 15% ($180) into Tax Reserve.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-lg bg-slate-800/90 border border-slate-700 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded bg-rose-900 text-rose-300 px-1.5 py-0.5 font-bold font-mono text-[10px]">
                    STEP 3
                  </span>
                  <Flame className="h-3.5 w-3.5 text-rose-400" />
                  <span className="font-bold text-white">Red-Team Defense</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Fire any of the 3 Red-Team attacks in the Arena (Prompt Injection, Shadow Phishing, Infinite Approve). Both off-chain firewall and Solidity smart account reject the attack with <strong>$0.00 loss</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
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
