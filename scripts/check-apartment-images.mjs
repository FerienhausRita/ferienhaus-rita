/**
 * Read-only Check: Inhalt der Tabelle apartment_images + Bucket.
 * Usage: node scripts/check-apartment-images.mjs
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
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("apartment_images")
  .select("id, apartment_id, storage_path, sort_order, created_at")
  .order("apartment_id", { ascending: true })
  .order("sort_order", { ascending: true });

if (error) {
  console.log(`❌ apartment_images NICHT erreichbar: ${error.message}`);
  process.exit(2);
}

console.log(`✅ apartment_images: ${data.length} Eintrag/Einträge`);
for (const r of data) {
  console.log(`  - ${r.apartment_id} | sort ${r.sort_order} | ${r.storage_path}`);
}

const { data: files } = await supabase.storage.from("apartment-images").list("", { limit: 100 });
console.log(`\nBucket-Root-Einträge: ${(files ?? []).map((f) => f.name).join(", ") || "(leer)"}`);
