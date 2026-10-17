import React, { useEffect, useState, useCallback } from "react";
import { VaultStatus, EscrowItem, AuditEvent } from "./types/api";
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
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firewallModalOpen, setFirewallModalOpen] = useState<boolean>(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [vData, eData, aData] = await Promise.all([
        apiClient.getVaultStatus().catch(() => null),
        apiClient.listEscrows().catch(() => []),
        apiClient.getAuditTrail().catch(() => []),
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
    // Poll every 8 seconds for background on-chain updates
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Institutional Telemetry Header */}
      <HeaderTelemetry
        vault={vault}
        loading={loading}
        onRefresh={fetchAllData}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Row 1: Session Key Guardrail Telemetry */}
        <PolicyGuardrailCard
          policy={vault?.policy || null}
          onOpenFirewallModal={() => setFirewallModalOpen(true)}
        />

        {/* Row 2: Two-Column Split: Intent Terminal & Escrow Lifecycle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Col 1: Natural Language Commercial Intent */}
          <IntentTerminal onEscrowCreated={fetchAllData} />

          {/* Col 2: Autonomous Perception & CI/CD Settlement */}
          <EscrowLifecyclePanel
            escrows={escrows}
            loading={loading}
            onSettled={fetchAllData}
          />
        </div>

        {/* Row 3: Live Red-Team Adversarial Defense Arena */}
        <RedTeamArena onAttackFinished={fetchAllData} />

        {/* Row 4: Real-time Immutable Audit Trail Feed */}
        <AuditTrailFeed
          events={auditTrail}
          loading={loading}
        />
      </main>

      {/* Firewall & Solidity Policy Inspector Modal */}
      <FirewallInspectorModal
        isOpen={firewallModalOpen}
        onClose={() => setFirewallModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0c121e] px-6 py-4 mt-8 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-slate-400">AegisPay Protocol</span>
          <span>• 2026 Shenzhen International FinTech Competition (Tsinghua PBCSF & WeBank)</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Decoupled AI Perception & Deterministic On-Chain Settlement
        </div>
      </footer>
    </div>
  );
};

export default App;
