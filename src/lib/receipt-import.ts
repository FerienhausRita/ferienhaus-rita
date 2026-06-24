import { createHash, randomUUID } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

export const BELEGE_BUCKET = "belege";

export interface ReceiptImportResult {
  success: boolean;
  error?: string;
  id?: string;
  duplicate?: boolean;
  ocrFailed?: boolean;
}

/**
 * Kernlogik für den Beleg-Import (Upload UND OneDrive-Cron):
 * SHA-256-Dedupe → Datei in privaten Bucket → OCR (fehlertolerant) →
 * Ausgaben-Entwurf (status='draft') anlegen. Keine Auth — der Aufrufer
 * (Action mit isAdminRequest / Cron mit Secret) sichert den Zugriff ab.
 */
export async function importReceipt(opts: {
  buffer: Buffer;
  filename: string;
  mime: string;
  source: string; // "upload" | "onedrive"
}): Promise<ReceiptImportResult> {
  const { buffer, filename, mime, source } = opts;
  if (!buffer || buffer.length === 0) return { success: false, error: "Leere Datei" };
  if (buffer.length > 15 * 1024 * 1024) return { success: false, error: "Datei zu groß (max. 15 MB)" };

  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const supabase = createServerClient();

  // Duplikat-Erkennung über den Datei-Hash.
  const { data: existing } = await supabase
    .from("expenses")
    .select("id")
    .eq("file_hash", fileHash)
    .limit(1)
    .maybeSingle();
  if (existing) return { success: true, duplicate: true, id: existing.id as string };

  const ext = (filename.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `drafts/${Date.now()}-${randomUUID()}.${ext || "pdf"}`;
  const { error: upErr } = await supabase.storage
    .from(BELEGE_BUCKET)
    .upload(path, buffer, { contentType: mime || "application/octet-stream", upsert: false });
  if (upErr) return { success: false, error: `Upload fehlgeschlagen: ${upErr.message}` };

  // OCR – fehlertolerant: ohne API-Key/bei Fehler leerer Entwurf zum manuellen Ausfüllen.
  let ocr: import("@/lib/ocr").ReceiptExtraction | null = null;
  let ocrFailed = false;
  try {
    const { extractReceipt } = await import("@/lib/ocr");
    ocr = await extractReceipt(buffer, mime);
  } catch {
    ocrFailed = true;
  }

  const gross = ocr?.gross ?? 0;
  const rate = ocr?.vat_rate ?? null;
  const net =
    ocr?.net ?? (rate != null && gross > 0 ? Math.round((gross / (1 + rate / 100)) * 100) / 100 : null);
  const vat =
    ocr?.vat_amount ?? (net != null && gross > 0 ? Math.round((gross - net) * 100) / 100 : null);

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      expense_date: ocr?.expense_date || todayISO(),
      category: ocr?.category || "Sonstiges",
      amount: gross,
      net_amount: net,
      vat_rate: rate,
      vat_amount: vat,
      payment_method: null,
      apartment_id: null,
      booking_id: null,
      note: ocr?.vendor ? `Beleg: ${ocr.vendor}` : null,
      receipt_path: path,
      status: "draft",
      file_hash: fileHash,
      vendor: ocr?.vendor || null,
      ocr_data: ocr ? (ocr as unknown as Record<string, unknown>) : null,
      source,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(BELEGE_BUCKET).remove([path]);
    return { success: false, error: error.message };
  }
  return { success: true, id: data?.id as string | undefined, duplicate: false, ocrFailed };
}
