import React, { useEffect, useState, useCallback } from "react";
import { VaultStateResponse, EscrowItemDTO, AuditEventDTO } from "./types/api";
import { apiClient } from "./services/apiClient";
import { HeaderTelemetry } from "./components/HeaderTelemetry";
import { PolicyGuardrailCard } from "./components/PolicyGuardrailCard";
import { IntentTerminal } from "./components/IntentTerminal";
import { EscrowLifecyclePanel } from "./components/EscrowLifecyclePanel";
import { FirewallInspectorModal } from "./components/FirewallInspectorModal";
import { RedTeamArena } from "./components/RedTeamArena";
import { AuditTrailFeed } from "./components/AuditTrailFeed";
import { ToastContainer, ToastMessage } from "./components/Toast";
import { Shield, Layers, ShieldCheck, History } from "lucide-react";

type MobileTab = "all" | "escrow" | "security" | "audit";

export const App: React.FC = () => {
  const [vault, setVault] = useState<VaultStateResponse | null>(null);
  const [escrows, setEscrows] = useState<EscrowItemDTO[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEventDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [firewallModalOpen, setFirewallModalOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("all");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [vData, eData, aData] = await Promise.all([
        apiClient.getVaultState().catch((err) => {
          console.error("Failed to fetch vault state:", err);
          return null;
        }),
        apiClient.listEscrows().catch((err) => {
          console.error("Failed to list escrows:", err);
          return [];
        }),
        apiClient.getAuditLog(50).catch((err) => {
          console.error("Failed to get audit log:", err);
          return [];
        }),
      ]);

      if (vData) setVault(vData);
      setEscrows(eData || []);
      setAuditTrail(aData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    // Background polling every 8 seconds for on-chain state sync
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleResetStart = () => {
    setIsResetting(true);
  };

  const handleResetComplete = (msg: string) => {
    setIsResetting(false);
    addToast({
      type: "info",
      title: "Sandbox Reset",
      message: msg,
    });
  };

  const handleEscrowCreated = (msg?: string, txHash?: string) => {
    fetchAllData();
    addToast({
      type: "success",
      title: "Commercial Escrow Created",
      message: msg || "Milestone escrow locked and funded on-chain.",
      txHash,
    });
  };

  const handleEscrowSettled = (msg?: string, txHash?: string) => {
    fetchAllData();
    addToast({
      type: "success",
      title: "Delivery Attestation Verified",
      message: msg || "Milestone released: 85% to Contractor, 15% to Tax Reserve.",
      txHash,
    });
  };

  const handleAttackFinished = (msg?: string) => {
    fetchAllData();
    addToast({
      type: "info",
      title: "Security Verification Complete",
      message: msg || "Adversarial exploit intercepted and reverted on-chain with $0.00 loss.",
    });
  };

  const isGlobalBusy = loading && !vault;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Institutional Top Navbar & Telemetry Strip */}
      <div className="max-w-[1360px] w-full mx-auto p-4 sm:p-6 lg:p-8 pb-0">
        <HeaderTelemetry
          vault={vault}
          loading={isGlobalBusy || isResetting}
          onRefresh={fetchAllData}
          onResetStart={handleResetStart}
          onResetComplete={handleResetComplete}
        />
      </div>

      {/* Mobile Navigation Segmented Control (Sticky on < 1024px) */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-xs border-b border-slate-200 py-2 px-4 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto max-w-[1360px] mx-auto py-0.5">
          <button
            onClick={() => setMobileTab("all")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mobileTab === "all"
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            All Views
          </button>
          <button
            onClick={() => setMobileTab("escrow")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              mobileTab === "escrow"
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>1. Treasury & Escrow</span>
          </button>
          <button
            onClick={() => setMobileTab("security")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              mobileTab === "security"
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>2. Guardrails & Security</span>
          </button>
          <button
            onClick={() => setMobileTab("audit")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              mobileTab === "audit"
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <History className="h-3 w-3" />
            <span>3. Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Main Command Center Grid */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 12-Column Responsive Split */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols on lg): Command Composer + Escrow Lifecycle */}
          <div
            className={`col-span-12 lg:col-span-7 space-y-6 ${
              mobileTab === "security" || mobileTab === "audit" ? "hidden lg:block" : "block"
            }`}
          >
            <IntentTerminal
              onEscrowCreated={handleEscrowCreated}
              disabled={isResetting}
            />

            <EscrowLifecyclePanel
              escrows={escrows}
              loading={isGlobalBusy || isResetting}
              onSettled={handleEscrowSettled}
              disabled={isResetting}
            />
          </div>

          {/* Right Column (5 cols on lg): Policy Guardrails + Red-Team Security Arena */}
          <div
            className={`col-span-12 lg:col-span-5 space-y-6 ${
              mobileTab === "escrow" || mobileTab === "audit" ? "hidden lg:block" : "block"
            }`}
          >
            <PolicyGuardrailCard
              policy={vault?.policy || null}
              loading={isGlobalBusy || isResetting}
              onOpenFirewallModal={() => setFirewallModalOpen(true)}
            />

            <RedTeamArena
              onAttackFinished={handleAttackFinished}
              disabled={isResetting}
            />
          </div>
        </div>

        {/* Bottom Full-Width Panel: Immutable Telemetry & Event Ledger */}
        <div
          className={`${
            mobileTab === "escrow" || mobileTab === "security" ? "hidden lg:block" : "block"
          }`}
        >
          <AuditTrailFeed
            events={auditTrail}
            loading={isGlobalBusy || isResetting}
          />
        </div>
      </main>

      {/* 2-Stage Firewall & Solidity Policy Inspector Modal */}
      <FirewallInspectorModal
        isOpen={firewallModalOpen}
        onClose={() => setFirewallModalOpen(false)}
        policy={vault?.policy || null}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-8 text-xs text-slate-500">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-800" />
            <span className="font-semibold text-slate-900">AegisPay Protocol</span>
            <span className="text-slate-300">•</span>
            <span>2026 Shenzhen International FinTech Competition (Tsinghua PBCSF & WeBank)</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>Probabilistic Perception</span>
            <span className="text-slate-300">→</span>
            <span>2-Stage Pre-Execution Firewall</span>
            <span className="text-slate-300">→</span>
            <span className="font-semibold text-slate-800">Deterministic Solidity Settlement</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
