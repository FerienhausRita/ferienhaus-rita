/**
 * Backfill: legt für bereits als bezahlt MARKIERTE Anzahlungen/Restbeträge
 * (deposit_paid_at / remainder_paid_at gesetzt), die noch KEINEN Eintrag im
 * Zahlungs-Ledger (booking_payments) haben, einen Ledger-Eintrag an.
 * Danach ist der Ledger die einzige Quelle und das Finanztool zeigt alles korrekt.
 *
 * Usage: node scripts/backfill-payments-ledger.mjs
 * Idempotent: bereits vorhandene Ledger-Buckets werden übersprungen.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const e = loadEnv(".env.local");
const sb = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Bestehende Ledger-Buckets erfassen (zur Dedup).
const led = (await sb.from("booking_payments").select("booking_id, applies_to")).data || [];
const have = new Set(led.map((p) => `${p.booking_id}|${p.applies_to}`));

const bookings =
  (await sb
    .from("bookings")
    .select("id, deposit_amount, remainder_amount, deposit_paid_at, remainder_paid_at")
    .neq("status", "cancelled")).data || [];

const toInsert = [];
for (const b of bookings) {
  if (b.deposit_paid_at && !have.has(`${b.id}|deposit`) && Number(b.deposit_amount) > 0) {
    toInsert.push({
      booking_id: b.id,
      amount: Math.round(Number(b.deposit_amount) * 100) / 100,
      paid_at: String(b.deposit_paid_at).slice(0, 10),
      method: "bank_transfer",
      applies_to: "deposit",
      note: "Backfill (Schnellerfassung)",
    });
  }
  if (b.remainder_paid_at && !have.has(`${b.id}|remainder`) && Number(b.remainder_amount) > 0) {
    toInsert.push({
      booking_id: b.id,
      amount: Math.round(Number(b.remainder_amount) * 100) / 100,
      paid_at: String(b.remainder_paid_at).slice(0, 10),
      method: "bank_transfer",
      applies_to: "remainder",
      note: "Backfill (Schnellerfassung)",
    });
  }
}

if (toInsert.length === 0) {
  console.log("Nichts zu tun – Ledger ist bereits vollständig.");
  process.exit(0);
}

const { error } = await sb.from("booking_payments").insert(toInsert);
if (error) {
  console.error("Fehler beim Backfill:", error.message);
  process.exit(1);
}
const sum = toInsert.reduce((s, r) => s + r.amount, 0);
console.log(`✅ ${toInsert.length} Ledger-Einträge angelegt (Σ ${sum.toFixed(2)} €).`);
