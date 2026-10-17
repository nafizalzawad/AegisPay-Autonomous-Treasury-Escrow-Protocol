import React, { useState, useEffect, useRef } from "react";
import { VaultStateResponse, HealthResponse } from "../types/api";
import { apiClient, RelayerMode } from "../services/apiClient";
import { Skeleton } from "./Skeleton";
import {
  Shield,
  Lock,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  GitPullRequest,
  Flame,
  Radio,
  X,
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
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [relayerMode, setRelayerMode] = useState<RelayerMode>(apiClient.getMode());
  const [showRelayerModal, setShowRelayerModal] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>(apiClient.getRelayerUrl());
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatusMsg, setConnectionStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showNotice, setShowNotice] = useState<boolean>(true);

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

  // Subscribe to mode changes
  useEffect(() => {
    return apiClient.onModeChange((mode) => {
      setRelayerMode(mode);
    });
  }, []);

  // Periodic health check
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await apiClient.getHealth();
        if (mounted) {
          setHealth(res);
          setRelayerMode(apiClient.getMode());
        }
      } catch {
        if (mounted) {
          setRelayerMode(apiClient.getMode());
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
      {/* Cloud Sandbox / Honest Mode Indicator */}
      {relayerMode === "simulator" && showNotice && (
        <div className="rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              <strong className="text-slate-900">Autonomous Cloud Sandbox Active:</strong> Running deterministic EVM & policy guardrails in-browser. Natural-language intent simulation, milestone settlements, and red-team defenses are fully interactive.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setShowRelayerModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
            >
              <Radio className="h-3 w-3 text-slate-500" />
              <span>Relayer Settings</span>
            </button>
            <button
              onClick={() => setShowNotice(false)}
              className="text-slate-400 hover:text-slate-600 px-1 text-xs"
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
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
            {/* Live Chain / Cloud Sandbox Telemetry Pill */}
            <button
              onClick={() => setShowRelayerModal(true)}
              className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 hover:border-slate-700 px-2.5 py-1 text-xs font-mono text-slate-300 transition-colors"
              title="Click to view or configure Relayer connection"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  relayerMode === "live" ? "bg-emerald-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span className="text-slate-400">
                {relayerMode === "live" ? "Anvil" : "Cloud Sandbox"}
              </span>
              <span className="text-slate-200">({health?.chain_id ?? 31337})</span>
              <span className="text-[10px] text-slate-500 border-l border-slate-800 pl-1.5 ml-0.5">
                {relayerMode === "live" ? "~2ms" : "Simulated EVM"}
              </span>
            </button>

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

      {/* Relayer & Execution Environment Configuration Modal */}
      {showRelayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-slate-800" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Execution Environment & Relayer Configuration
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowRelayerModal(false);
                  setConnectionStatusMsg(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Current Active Mode */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">Active Execution Mode:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      relayerMode === "live"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {relayerMode === "live" ? "Live Anvil Relayer (31337)" : "Autonomous Cloud Sandbox"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {relayerMode === "live"
                    ? "Directly connected to a live Web3.py relayer and local Anvil EVM node. All transactions and state queries execute on-chain."
                    : "Running in-browser deterministic EVM simulation. All session key guardrails, milestone escrow state transitions, and red-team defenses run locally with zero latency."}
                </p>
              </div>

              {/* Custom Relayer Connection Input */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-800">
                  Custom Relayer RPC / API Endpoint (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="e.g. http://127.0.0.1:8000 or https://your-tunnel.ngrok.app"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                  <button
                    disabled={testingConnection}
                    onClick={async () => {
                      setTestingConnection(true);
                      setConnectionStatusMsg(null);
                      try {
                        apiClient.setRelayerUrl(customUrlInput);
                        const healthRes = await apiClient.getHealth();
                        if (healthRes.ok) {
                          setConnectionStatusMsg({
                            type: "success",
                            text: `Connected successfully! Chain ID: ${healthRes.chain_id}`,
                          });
                          onRefresh();
                        } else {
                          setConnectionStatusMsg({
                            type: "error",
                            text: "Relayer responded but reported unready.",
                          });
                        }
                      } catch (err: unknown) {
                        setConnectionStatusMsg({
                          type: "error",
                          text: `Could not connect: ${err instanceof Error ? err.message : String(err)}. Falling back to Cloud Sandbox.`,
                        });
                      } finally {
                        setTestingConnection(false);
                      }
                    }}
                    className="rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-2 text-xs transition-colors disabled:opacity-50"
                  >
                    {testingConnection ? "Testing..." : "Connect"}
                  </button>
                </div>
                {connectionStatusMsg && (
                  <div
                    className={`rounded p-2 text-[11px] ${
                      connectionStatusMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {connectionStatusMsg.text}
                  </div>
                )}
              </div>

              {/* Local Dev Quickstart Help */}
              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1.5 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800 block">
                  Running AegisPay Locally with Real Anvil Node:
                </span>
                <p>To run the full Anvil EVM node + FastAPI relayer on your machine:</p>
                <div className="rounded bg-slate-900 text-slate-200 p-2 font-mono text-[10px] select-all">
                  make demo
                </div>
                <p className="text-[10px] text-slate-500">
                  Note: If accessing via HTTPS (such as Vercel), your browser may block HTTP localhost calls due to mixed content rules. Use an HTTPS reverse proxy (like ngrok or localtunnel) or run Vite locally at <code>http://localhost:5173</code>.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50">
              <button
                onClick={() => {
                  setCustomUrlInput("");
                  apiClient.setRelayerUrl("");
                  setConnectionStatusMsg({
                    type: "success",
                    text: "Reset to auto-detecting mode.",
                  });
                  onRefresh();
                }}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
              >
                Reset to Auto-Detect
              </button>
              <button
                onClick={() => {
                  setShowRelayerModal(false);
                  setConnectionStatusMsg(null);
                }}
                className="rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-1.5 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
