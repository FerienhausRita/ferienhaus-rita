"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setOneDriveFolder,
  disconnectOneDrive,
  syncOneDriveNow,
  type OneDriveStatus,
} from "@/app/(admin)/admin/actions";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function OneDriveSettings({
  status,
  banner,
}: {
  status: OneDriveStatus;
  banner?: string;
}) {
  const router = useRouter();
  const [folder, setFolder] = useState(status.folder);
  const [busy, setBusy] = useState<"save" | "sync" | "disconnect" | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(() => {
    if (banner === "connected") return { type: "ok", text: "OneDrive erfolgreich verbunden." };
    if (banner === "error") return { type: "err", text: "Verbindung fehlgeschlagen. Bitte erneut versuchen." };
    if (banner === "state") return { type: "err", text: "Sicherheitsprüfung fehlgeschlagen. Bitte erneut verbinden." };
    return null;
  });

  const inputClass =
    "px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  const saveFolder = async () => {
    setBusy("save");
    const r = await setOneDriveFolder(folder);
    setBusy(null);
    setMsg(r.success ? { type: "ok", text: "Ordner gespeichert." } : { type: "err", text: r.error || "Fehler" });
    if (r.success) router.refresh();
  };

  const syncNow = async () => {
    setBusy("sync");
    const r = await syncOneDriveNow();
    setBusy(null);
    if (!r.success) setMsg({ type: "err", text: r.error || "Fehler" });
    else {
      const parts = [`${r.imported ?? 0} neu`];
      if (r.duplicates) parts.push(`${r.duplicates} schon vorhanden`);
      if (r.failed) parts.push(`${r.failed} fehlgeschlagen`);
      setMsg({ type: "ok", text: `Synchronisiert: ${parts.join(" · ")} (von ${r.scanned ?? 0} geprüft).` });
      router.refresh();
    }
  };

  const disconnect = async () => {
    if (!confirm("OneDrive-Verbindung trennen? Der automatische Import wird gestoppt.")) return;
    setBusy("disconnect");
    const r = await disconnectOneDrive();
    setBusy(null);
    if (!r.success) setMsg({ type: "err", text: r.error || "Fehler" });
    else router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-stone-900">OneDrive-Beleg-Import</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            status.connected
              ? "bg-emerald-50 text-emerald-700"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {status.connected ? "verbunden" : "nicht verbunden"}
        </span>
      </div>
      <p className="text-xs text-stone-400 mb-4">
        Belege aus einem OneDrive-Ordner werden stündlich automatisch ausgelesen und als Entwurf
        angelegt (Duplikate werden übersprungen). Prüfen &amp; bestätigen wie bei hochgeladenen Belegen.
      </p>

      {msg && (
        <p className={`mb-4 text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>
      )}

      {!status.configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          OneDrive ist noch nicht eingerichtet. Es fehlen die Azure-Zugangsdaten
          (Umgebungsvariablen <code>MS_GRAPH_CLIENT_ID</code>, <code>MS_GRAPH_CLIENT_SECRET</code>,
          <code> MS_GRAPH_REDIRECT_URI</code>). Sobald diese in Vercel gesetzt sind, erscheint hier der
          Verbinden-Button.
        </div>
      ) : !status.connected ? (
        <a
          href="/api/admin/onedrive/connect"
          className="inline-flex items-center gap-2 bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          Mit OneDrive verbinden
        </a>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Ordner in OneDrive (Pfad)</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="z. B. Belege oder Belege/Ferienhaus"
                className={`${inputClass} flex-1 min-w-[220px]`}
              />
              <button
                type="button"
                onClick={saveFolder}
                disabled={busy !== null}
                className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {busy === "save" ? "…" : "Speichern"}
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Relativ zum OneDrive-Stamm. Leer lassen = Stammordner.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={syncNow}
              disabled={busy !== null}
              className="bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {busy === "sync" ? "Synchronisiere…" : "Jetzt synchronisieren"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={busy !== null}
              className="text-sm text-stone-500 hover:text-red-600 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              Verbindung trennen
            </button>
          </div>

          {status.lastSync && (
            <p className="text-[11px] text-stone-400">
              Letzte Synchronisation: {fmtDateTime(status.lastSync.at)} · {status.lastSync.imported} neu
              {status.lastSync.duplicates ? `, ${status.lastSync.duplicates} schon vorhanden` : ""}
              {status.lastSync.failed ? `, ${status.lastSync.failed} fehlgeschlagen` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
