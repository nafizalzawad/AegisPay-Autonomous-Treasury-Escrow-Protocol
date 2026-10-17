import React from "react";
import { AuditEventDTO } from "../types/api";
import {
  History,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  KeyRound,
  GitPullRequest,
  Terminal,
} from "lucide-react";

interface AuditTrailFeedProps {
  events: AuditEventDTO[];
  loading?: boolean;
}

export const AuditTrailFeed: React.FC<AuditTrailFeedProps> = ({ events, loading }) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
            <AlertOctagon className="h-3 w-3" />
            CRITICAL BLOCKED
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            WARNING
          </span>
        );
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            SUCCESS
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
            <Info className="h-3 w-3" />
            INFO
          </span>
        );
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("FIREWALL") || eventType.includes("REVERT")) {
      return <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />;
    }
    if (eventType.includes("ESCROW_CREATED")) {
      return <KeyRound className="h-3.5 w-3.5 text-blue-600" />;
    }
    if (eventType.includes("WEBHOOK") || eventType.includes("ESCROW_SETTLED")) {
      return <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" />;
    }
    return <Terminal className="h-3.5 w-3.5 text-slate-500" />;
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              On-Chain & Perception Audit Trail
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 border border-slate-200">
                Immutable Ledger
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Chronological log of agent reasoning, firewall interceptions, and smart contract settlements
            </p>
          </div>
        </div>

        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200">
          {events.length} Records
        </span>
      </div>

      {/* Events Feed */}
      <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1 font-sans">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            {loading ? "Loading audit records..." : "No audit records recorded yet."}
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs transition-all hover:bg-slate-50 hover:border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{getEventIcon(ev.event_type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-900 font-mono">
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTimestamp(ev.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs mt-0.5">
                    {ev.summary}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                {ev.tx_hash && (
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-mono text-blue-700 border border-slate-200 shadow-2xs">
                    Tx: {ev.tx_hash.substring(0, 8)}...{ev.tx_hash.substring(ev.tx_hash.length - 4)}
                  </span>
                )}
                {getSeverityBadge(ev.severity)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
