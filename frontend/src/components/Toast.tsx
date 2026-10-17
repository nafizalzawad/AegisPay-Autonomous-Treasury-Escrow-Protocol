import React from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  txHash?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border p-3.5 shadow-lg backdrop-blur-xs flex items-start gap-3 transition-all transform translate-y-0 ${
              isSuccess
                ? "bg-white border-emerald-200 text-slate-900"
                : isError
                ? "bg-white border-rose-200 text-slate-900"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {isError && <AlertTriangle className="h-4 w-4 text-rose-600" />}
              {!isSuccess && !isError && <Info className="h-4 w-4 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900">{t.title}</p>
              {t.message && (
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{t.message}</p>
              )}
              {t.txHash && (
                <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded w-fit">
                  <span>Tx:</span>
                  <span className="text-blue-700 font-semibold truncate max-w-[180px]">
                    {t.txHash.substring(0, 10)}...{t.txHash.substring(t.txHash.length - 8)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
