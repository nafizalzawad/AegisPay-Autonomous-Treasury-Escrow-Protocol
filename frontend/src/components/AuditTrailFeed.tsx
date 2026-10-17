import React, { useState } from "react";
import { AuditEventDTO } from "../types/api";
import { Skeleton } from "./Skeleton";
import {
  Copy,
  Check,
} from "lucide-react";

interface AuditTrailFeedProps {
  events: AuditEventDTO[];
  loading?: boolean;
}

export const AuditTrailFeed: React.FC<AuditTrailFeedProps> = ({ events, loading = false }) => {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(id);
    setTimeout(() => setCopiedTx(null), 2000);
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

  const getStatusBadge = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === "CRITICAL" || sev === "DANGER") {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          BLOCKED
        </span>
      );
    }
    if (sev === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          WARNING
        </span>
      );
    }
    if (sev === "SUCCESS") {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          SUCCESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
        INFO
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-subtle overflow-hidden">
      {/* Table Header / Title */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            Immutable Telemetry & Security Audit Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Chronological cryptographic log of agent perceptions, pre-execution firewall blocks, and on-chain settlements
          </p>
        </div>

        <span className="font-mono text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded self-start sm:self-center">
          {events.length} Recorded Events
        </span>
      </div>

      {/* High-Density Financial Event Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4 font-medium whitespace-nowrap">Time (UTC)</th>
              <th className="py-2.5 px-4 font-medium whitespace-nowrap">Event Type</th>
              <th className="py-2.5 px-4 font-medium">Summary & Solidity Telemetry</th>
              <th className="py-2.5 px-4 font-medium whitespace-nowrap">Tx Hash / Proof</th>
              <th className="py-2.5 px-4 font-medium whitespace-nowrap text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-64" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-slate-500 font-mono">
                  No audit records generated yet.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr
                  key={ev.id}
                  className="hover:bg-slate-50/70 transition-colors text-slate-800"
                >
                  {/* Timestamp */}
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                    {formatTimestamp(ev.timestamp)}
                  </td>

                  {/* Event Type */}
                  <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                    {ev.event_type}
                  </td>

                  {/* Summary */}
                  <td className="py-2.5 px-4 text-slate-700 max-w-md">
                    <span className="line-clamp-2 leading-relaxed">{ev.summary}</span>
                  </td>

                  {/* Tx Hash */}
                  <td className="py-2.5 px-4 font-mono text-[11px] whitespace-nowrap">
                    {ev.tx_hash ? (
                      <div className="flex items-center gap-1.5 text-blue-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded w-fit">
                        <span>{ev.tx_hash.substring(0, 8)}...</span>
                        <button
                          onClick={() => copyToClipboard(ev.tx_hash!, ev.id)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy Full Transaction Hash"
                        >
                          {copiedTx === ev.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[10px]">Off-Chain Event</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    {getStatusBadge(ev.severity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
