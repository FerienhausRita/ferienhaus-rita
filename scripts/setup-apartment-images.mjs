/**
 * Legt den Storage-Bucket "apartment-images" an (öffentlich lesbar).
 *
 * Usage: node scripts/setup-apartment-images.mjs
 * Benötigt NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Idempotent: existiert der Bucket bereits, passiert nichts.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// .env.local selbst einlesen (ohne dotenv-Abhängigkeit).
function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  } catch {
    // ignore – fällt unten auf process.env zurück
  }
  return env;
}

const fileEnv = loadEnv(".env.local");
const url = fileEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = fileEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Fehlende Variablen: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const BUCKET = "apartment-images";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
if (listErr) {
  console.error("Fehler beim Auflisten der Buckets:", listErr.message);
  process.exit(1);
}

if (buckets?.some((b) => b.name === BUCKET)) {
  console.log(`Bucket "${BUCKET}" existiert bereits – nichts zu tun.`);
  process.exit(0);
}

const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: "10MB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
});

if (createErr) {
  console.error(`Fehler beim Anlegen des Buckets "${BUCKET}":`, createErr.message);
  process.exit(1);
}

console.log(`✅ Bucket "${BUCKET}" erstellt (öffentlich lesbar, max. 10 MB, nur Bildformate).`);
