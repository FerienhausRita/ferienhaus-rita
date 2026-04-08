"use client";

import { useState } from "react";
import { debugICalFeeds, triggerICalSync } from "@/app/(admin)/admin/actions";

export default function ICalDebug() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleDebug() {
    setLoading(true);
    setSyncResult(null);
    try {
      const result = await debugICalFeeds();
      setData(result);
    } catch (err) {
      setData({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await triggerICalSync();
      setSyncResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setSyncResult(`Fehler: ${err}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex gap-3">
        <button
          onClick={handleDebug}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:border-[#c8a96e]/50 hover:text-[#c8a96e] disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          {loading ? "Lade Feeds..." : "Smoobu-Feeds prüfen"}
        </button>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          {syncing ? "Synchronisiert..." : "Jetzt synchronisieren"}
        </button>
      </div>

      {syncResult && (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm font-medium text-emerald-800 mb-2">Sync-Ergebnis:</p>
          <pre className="text-xs text-emerald-700 whitespace-pre-wrap overflow-x-auto">{syncResult}</pre>
        </div>
      )}

      {data && (
        <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Rohdaten aus Smoobu iCal-Feeds:
          </p>
          {Object.entries(data).map(([apt, info]) => (
            <div key={apt} className="mb-4 last:mb-0">
              <h4 className="font-semibold text-stone-900 text-sm mb-2">{apt}</h4>
              <pre className="text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-100 whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(info, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
