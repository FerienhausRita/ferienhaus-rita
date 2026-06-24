import { createServerClient } from "@/lib/supabase/server";
import {
  refreshAccessToken,
  listFolderFiles,
  downloadFile,
  isImportableReceipt,
  isOneDriveConfigured,
} from "@/lib/onedrive";
import { importReceipt } from "@/lib/receipt-import";

const MAX_PER_RUN = 25;

export interface OneDriveSyncResult {
  ok: boolean;
  reason?: "not_configured" | "not_connected";
  error?: string;
  folder?: string;
  scanned?: number;
  imported?: number;
  duplicates?: number;
  failed?: number;
}

/** Liest den konfigurierten OneDrive-Ordner aus und importiert neue Belege
 *  (Dedupe über Datei-Hash). Wird von Cron und manuellem Trigger genutzt. */
export async function runOneDriveImport(): Promise<OneDriveSyncResult> {
  if (!isOneDriveConfigured()) return { ok: false, reason: "not_configured" };

  const supabase = createServerClient();
  const { data: tokenRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "onedrive_token")
    .maybeSingle();
  const refreshToken = (tokenRow?.value as { refresh_token?: string } | null)?.refresh_token;
  if (!refreshToken) return { ok: false, reason: "not_connected" };

  const { data: folderRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "onedrive_folder")
    .maybeSingle();
  const folder = (folderRow?.value as string | null) || "Belege";

  try {
    const tokens = await refreshAccessToken(refreshToken);
    if (tokens.refresh_token && tokens.refresh_token !== refreshToken) {
      await supabase.from("site_settings").upsert({
        key: "onedrive_token",
        value: { refresh_token: tokens.refresh_token, connected_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
    }

    const files = (await listFolderFiles(tokens.access_token, folder))
      .filter(isImportableReceipt)
      .filter((f) => f.size > 0 && f.size <= 15 * 1024 * 1024)
      .slice(0, MAX_PER_RUN);

    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    for (const f of files) {
      try {
        const buffer = await downloadFile(tokens.access_token, f.id);
        const res = await importReceipt({ buffer, filename: f.name, mime: f.mimeType, source: "onedrive" });
        if (!res.success) failed++;
        else if (res.duplicate) duplicates++;
        else imported++;
      } catch (e) {
        console.error("OneDrive-Import-Fehler:", f.name, e);
        failed++;
      }
    }

    await supabase.from("site_settings").upsert({
      key: "onedrive_last_sync",
      value: { at: new Date().toISOString(), scanned: files.length, imported, duplicates, failed },
      updated_at: new Date().toISOString(),
    });

    return { ok: true, folder, scanned: files.length, imported, duplicates, failed };
  } catch (e) {
    console.error("OneDrive-Sync-Fehler:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Fehler" };
  }
}
