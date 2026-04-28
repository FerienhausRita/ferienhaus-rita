"use client";

import { useState } from "react";
import { triggerICalSync } from "@/app/(admin)/admin/actions";

interface SyncApartmentResult {
  name: string;
  blocked_count: number;
  deleted_count: number;
  status: "ok" | "error";
  error?: string;
}

interface SyncResult {
  apartments: SyncApartmentResult[];
  synced_at: string;
}

export default function ICalSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await triggerICalSync();
      setResult(res as SyncResult);
    } catch (err) {
      setError(`Synchronisation fehlgeschlagen: ${err}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
          />
        </svg>
        {syncing ? "Synchronisiert..." : "iCal sync"}
      </button>

      {/* Compact result summary */}
      {result && !error && (
        <div className="flex items-center gap-2 text-xs text-stone-500">
          {result.apartments.map((apt) => (
            <span
              key={apt.name}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                apt.status === "ok"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
              title={
                apt.status === "ok"
                  ? `${apt.blocked_count} blockierte Zeiträume synchronisiert`
                  : `Fehler: ${apt.error}`
              }
            >
              {apt.status === "ok" ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {apt.name} ({apt.blocked_count})
            </span>
          ))}
          <span className="text-stone-400 ml-1">
            {new Date(result.synced_at).toLocaleTimeString("de-AT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          {error}
        </span>
      )}
    </div>
  );
}
