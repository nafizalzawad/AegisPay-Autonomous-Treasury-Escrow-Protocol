import React, { useState, useEffect, useRef } from "react";
import { VaultStateResponse, HealthResponse } from "../types/api";
import { apiClient } from "../services/apiClient";
import { Skeleton } from "./Skeleton";
import {
  Shield,
  Lock,
  RotateCcw,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  GitPullRequest,
  Flame,
} from "lucide-react";

interface HeaderTelemetryProps {
  vault: VaultStateResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onResetStart?: () => void;
  onResetComplete?: (msg: string) => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  vault,
  loading,
  onRefresh,
  onResetStart,
  onResetComplete,
}) => {
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendLive, setBackendLive] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Delta highlight states
  const prevBalancesRef = useRef<{
    total: number;
    operating: number;
    tax: number;
    contractor: number;
  } | null>(null);

  const [deltas, setDeltas] = useState<{
    total?: number;
    operating?: number;
    tax?: number;
    contractor?: number;
  }>({});

  useEffect(() => {
    if (!vault) return;

    if (prevBalancesRef.current) {
      const prev = prevBalancesRef.current;
      const dTotal = vault.total_balance_usdc - prev.total;
      const dOperating = vault.operating_balance_usdc - prev.operating;
      const dTax = vault.tax_reserve_balance_usdc - prev.tax;
      const dContractor = vault.contractor_balance_usdc - prev.contractor;

      const newDeltas: typeof deltas = {};
      if (Math.abs(dTotal) > 0.01) newDeltas.total = dTotal;
      if (Math.abs(dOperating) > 0.01) newDeltas.operating = dOperating;
      if (Math.abs(dTax) > 0.01) newDeltas.tax = dTax;
      if (Math.abs(dContractor) > 0.01) newDeltas.contractor = dContractor;

      if (Object.keys(newDeltas).length > 0) {
        setDeltas(newDeltas);
        const timer = setTimeout(() => {
          setDeltas({});
        }, 2000);
        return () => clearTimeout(timer);
      }
    }

    prevBalancesRef.current = {
      total: vault.total_balance_usdc,
      operating: vault.operating_balance_usdc,
      tax: vault.tax_reserve_balance_usdc,
      contractor: vault.contractor_balance_usdc,
    };
  }, [vault]);

  // Periodic health check
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
      if (onResetStart) onResetStart();
      await apiClient.resetDemoState();
      onRefresh();
      if (onResetComplete) {
        onResetComplete("Sandbox re-seeded to initial state.");
      }
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

  const agentSessionKey =
    vault?.policy?.session_key_address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const renderDelta = (delta?: number) => {
    if (delta === undefined) return null;
    const isPositive = delta > 0;
    const sign = isPositive ? "+" : "";
    return (
      <span
        className={`ml-2 text-xs font-mono font-medium px-1.5 py-0.5 rounded transition-all ${
          isPositive
            ? "bg-emerald-100 text-emerald-800"
            : "bg-rose-100 text-rose-800"
        }`}
      >
        {sign}${delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Reconnection Alert if Backend Unreachable */}
      {!backendLive && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              Connecting to AegisPay Backend Relayer... Retrying connection at http://127.0.0.1:8000
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-700">Auto-Reconnecting</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="rounded-lg border border-slate-800 bg-slate-950 px-4 sm:px-6 py-3 text-slate-100 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 border border-slate-700 text-white shadow-xs">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-white">
                  AegisPay
                </span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Autonomous Treasury & Escrow Protocol
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  Topic F • ERC-4337
                </span>
              </div>
            </div>
          </div>

          {/* Telemetry Pills & Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Chain Telemetry Pill */}
            <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendLive ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              <span className="text-slate-400">Anvil</span>
              <span className="text-slate-200">({health?.chain_id ?? 31337})</span>
              <span className="text-[10px] text-slate-500 border-l border-slate-800 pl-1.5 ml-0.5">
                ~2ms
              </span>
            </div>

            {/* Vault Address Pill */}
            {vault?.vault_address && (
              <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-300">
                <span className="text-slate-400">Vault:</span>
                <span>{formatAddress(vault.vault_address)}</span>
                <button
                  onClick={() => copyToClipboard(vault.vault_address, "vault")}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Copy Vault Address"
                  aria-label="Copy Vault Address"
                >
                  {copied === "vault" ? (
                    <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}

            {/* Session Key Pill */}
            <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-300">
              <span className="text-slate-400">Session Key:</span>
              <span>{formatAddress(agentSessionKey)}</span>
              <button
                onClick={() => copyToClipboard(agentSessionKey, "agentKey")}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy Session Key Address"
                aria-label="Copy Session Key Address"
              >
                {copied === "agentKey" ? (
                  <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Guide Button */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 px-2.5 py-1 transition-colors"
              title="Toggle Live Demo Walkthrough Guide"
            >
              <span>Guide</span>
              {showGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {/* Reset Sandbox Button */}
            <button
              onClick={handleResetDemo}
              disabled={resetting || loading}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 px-3 py-1 transition-colors disabled:opacity-50"
              title="Reset chain state and demo escrows to initial seed"
            >
              <RotateCcw className={`h-3 w-3 text-slate-300 ${resetting ? "animate-spin" : ""}`} />
              <span>{resetting ? "Resetting..." : "Reset Sandbox"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Demo Mode Quick-Guide */}
        {showGuide && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Demo Walkthrough — 3-Step Autonomous Loop
              </span>
              <span className="text-[10px] font-mono text-slate-500">Topic F Evaluation Flow</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {/* Step 1 */}
              <div className="rounded bg-slate-900/90 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 mb-1 text-slate-200 font-semibold">
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                    01
                  </span>
                  <FileText className="h-3 w-3 text-slate-400" />
                  <span>Commercial Intent</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Select Preset 1 in the Composer. Click <strong>Simulate</strong> for the 2-stage
                  firewall dry-run, then click <strong>Authorize & Execute</strong> to lock escrow
                  on-chain.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded bg-slate-900/90 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 mb-1 text-slate-200 font-semibold">
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                    02
                  </span>
                  <GitPullRequest className="h-3 w-3 text-slate-400" />
                  <span>Perception & Settlement</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Trigger <strong>Passing GitHub CI Webhook</strong>. Agent verifies proof, releases
                  85% ($1,020) to DevStudio, and isolates 15% ($180) into Tax Reserve.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded bg-slate-900/90 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 mb-1 text-slate-200 font-semibold">
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                    03
                  </span>
                  <Flame className="h-3 w-3 text-slate-400" />
                  <span>Red-Team Defense</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Fire any of the 3 Red-Team exploits (Injection, Phishing, Infinite Approve). Both
                  firewall and Solidity smart account reject the attack with{" "}
                  <strong>$0.00 loss</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Unified 4-Metric Architectural Hairline Strip */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* Cell 1: Total Vault Custody */}
        <div
          className={`p-4 sm:p-5 transition-colors duration-1000 ${
            deltas.total !== undefined ? "bg-emerald-50/70" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider text-[11px]">Total Vault Custody</span>
            <span className="font-mono text-[10px] text-slate-400">Chain: 31337</span>
          </div>
          <div className="mt-2 flex items-baseline">
            {loading || resetting ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <>
                <span className="text-slate-900 font-mono text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums">
                  $
                  {vault
                    ? vault.total_balance_usdc.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "24,200.00"}
                </span>
                <span className="ml-1.5 text-xs font-mono text-slate-500">mUSDC</span>
                {renderDelta(deltas.total)}
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">On-chain smart account balance</p>
        </div>

        {/* Cell 2: Operating Liquidity */}
        <div
          className={`p-4 sm:p-5 transition-colors duration-1000 ${
            deltas.operating !== undefined ? "bg-emerald-50/70" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider text-[11px]">Operating Liquidity</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-slate-500">Active</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline">
            {loading || resetting ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <>
                <span className="text-slate-900 font-mono text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums">
                  $
                  {vault
                    ? vault.operating_balance_usdc.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "24,080.00"}
                </span>
                <span className="ml-1.5 text-xs font-mono text-slate-500">mUSDC</span>
                {renderDelta(deltas.operating)}
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span>Available to Session Key within policy</span>
          </p>
        </div>

        {/* Cell 3: Tax Reserve Sub-Ledger */}
        <div
          className={`p-4 sm:p-5 transition-colors duration-1000 ${
            deltas.tax !== undefined ? "bg-emerald-50/70" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider text-[11px]">Tax Reserve Sub-Ledger</span>
            <span className="text-[10px] font-mono text-slate-400">15% Split</span>
          </div>
          <div className="mt-2 flex items-baseline">
            {loading || resetting ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <>
                <span className="text-slate-900 font-mono text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums">
                  $
                  {vault
                    ? vault.tax_reserve_balance_usdc.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "120.00"}
                </span>
                <span className="ml-1.5 text-xs font-mono text-slate-500">mUSDC</span>
                {renderDelta(deltas.tax)}
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-slate-400 inline-block shrink-0" />
            <span>15% auto-withheld • Isolated from Agent</span>
          </p>
        </div>

        {/* Cell 4: Contractor Settled (DevStudio) */}
        <div
          className={`p-4 sm:p-5 transition-colors duration-1000 ${
            deltas.contractor !== undefined ? "bg-emerald-50/70" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider text-[11px]">Contractor Settled</span>
            <span className="text-[10px] font-mono text-slate-400">DevStudio</span>
          </div>
          <div className="mt-2 flex items-baseline">
            {loading || resetting ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <>
                <span className="text-slate-900 font-mono text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums">
                  $
                  {vault
                    ? vault.contractor_balance_usdc.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "680.00"}
                </span>
                <span className="ml-1.5 text-xs font-mono text-slate-500">mUSDC</span>
                {renderDelta(deltas.contractor)}
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono text-[11px] truncate">
            0x3C44...93BC • Whitelisted Beneficiary
          </p>
        </div>
      </div>
    </div>
  );
};
