import React from "react";
import { AuditEvent } from "../types/api";
import { History, CheckCircle2, AlertOctagon, Terminal, KeyRound, GitPullRequest, Flame } from "lucide-react";

interface AuditTrailFeedProps {
  events: AuditEvent[];
  loading?: boolean;
}

export const AuditTrailFeed: React.FC<AuditTrailFeedProps> = ({ events }) => {
  const getEventBadge = (_type: string, status: string) => {
    if (status === "BLOCKED") {
      return (
        <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20 flex items-center gap-1">
          <AlertOctagon className="h-3 w-3" />
          BLOCKED
        </span>
      );
    }
    if (status === "SUCCESS") {
      return (
        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          SUCCESS
        </span>
      );
    }
    return (
      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 font-mono">
        {status}
      </span>
    );
  };

  const getActorIcon = (actor: string) => {
    if (actor.includes("AGENT")) return <KeyRound className="h-3.5 w-3.5 text-cyan-400" />;
    if (actor.includes("WEBHOOK") || actor.includes("GITHUB")) return <GitPullRequest className="h-3.5 w-3.5 text-emerald-400" />;
    if (actor.includes("RED_TEAM") || actor.includes("ATTACKER")) return <Flame className="h-3.5 w-3.5 text-rose-400" />;
    return <Terminal className="h-3.5 w-3.5 text-slate-400" />;
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              On-Chain & Perception Audit Trail
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                Immutable Ledger
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Chronological log of agent reasoning, firewall interceptions, and smart contract settlements
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing {events.length} events
        </span>
      </div>

      {/* Events Feed */}
      <div className="mt-4 max-h-96 overflow-y-auto space-y-2 pr-1 font-mono">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No audit records yet.
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs transition-all hover:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{getActorIcon(ev.actor)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-200">
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      via {ev.actor}
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs mt-0.5">
                    {ev.summary}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {ev.tx_hash && (
                  <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] text-cyan-400 border border-slate-800">
                    Tx: {ev.tx_hash.substring(0, 8)}...
                  </span>
                )}
                {getEventBadge(ev.event_type, ev.status)}
                <span className="text-[10px] text-slate-500">
                  {formatTimestamp(ev.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
