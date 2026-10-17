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
import { Shield } from "lucide-react";

export const App: React.FC = () => {
  const [vault, setVault] = useState<VaultStateResponse | null>(null);
  const [escrows, setEscrows] = useState<EscrowItemDTO[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEventDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firewallModalOpen, setFirewallModalOpen] = useState<boolean>(false);

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
    // Background polling every 10 seconds for on-chain state sync
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Institutional Top Navbar & Telemetry KPIs */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 pb-0">
        <HeaderTelemetry
          vault={vault}
          loading={loading}
          onRefresh={fetchAllData}
        />
      </div>

      {/* Main Command Center Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 12-Column Responsive Split */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols on lg): Natural Language Intent + Escrow Lifecycle */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <IntentTerminal onEscrowCreated={fetchAllData} />
            <EscrowLifecyclePanel
              escrows={escrows}
              loading={loading}
              onSettled={fetchAllData}
            />
          </div>

          {/* Right Column (5 cols on lg): Policy Guardrails + Red-Team Arena */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <PolicyGuardrailCard
              policy={vault?.policy || null}
              onOpenFirewallModal={() => setFirewallModalOpen(true)}
            />
            <RedTeamArena onAttackFinished={fetchAllData} />
          </div>
        </div>

        {/* Full-Width Immutable Audit Trail Feed */}
        <AuditTrailFeed
          events={auditTrail}
          loading={loading}
        />
      </main>

      {/* 2-Stage Firewall & Solidity Policy Inspector Modal */}
      <FirewallInspectorModal
        isOpen={firewallModalOpen}
        onClose={() => setFirewallModalOpen(false)}
        policy={vault?.policy || null}
      />

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-700" />
            <span className="font-bold text-slate-800">AegisPay Smart Treasury Architecture</span>
            <span className="text-slate-400">•</span>
            <span>2026 Shenzhen International FinTech Competition (Tsinghua PBCSF & WeBank)</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>Decoupled AI Perception</span>
            <span className="text-slate-400">→</span>
            <span>2-Stage Pre-Execution Firewall</span>
            <span className="text-slate-400">→</span>
            <span className="font-semibold text-slate-700">Deterministic Solidity Settlement</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
