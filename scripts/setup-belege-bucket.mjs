/**
 * Legt den PRIVATEN Storage-Bucket "belege" an (für Ausgaben-Belege).
 * Usage: node scripts/setup-belege-bucket.mjs
 * Benötigt NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Idempotent: existiert der Bucket bereits, passiert nichts.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[t.slice(0, eq).trim()] = v;
    }
  } catch {}
  return env;
}

const e = loadEnv(".env.local");
const url = e.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = e.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Fehlende Variablen in .env.local");
  process.exit(1);
}

const BUCKET = "belege";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
if (listErr) {
  console.error("Fehler beim Auflisten:", listErr.message);
  process.exit(1);
}
if (buckets?.some((b) => b.name === BUCKET)) {
  console.log(`Bucket "${BUCKET}" existiert bereits – nichts zu tun.`);
  process.exit(0);
}

const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
  public: false,
  fileSizeLimit: "15MB",
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"],
});
if (createErr) {
  console.error(`Fehler beim Anlegen von "${BUCKET}":`, createErr.message);
  process.exit(1);
}
console.log(`✅ Privater Bucket "${BUCKET}" erstellt (max. 15 MB, PDF/Bilder).`);
