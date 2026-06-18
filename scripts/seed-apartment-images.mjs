/**
 * Übernimmt die bestehenden Standard-Fotos (aus src/data/apartments.ts +
 * public/images/...) einmalig in Storage-Bucket + Tabelle apartment_images,
 * damit die Foto-Verwaltung mit den aktuellen Fotos vorbefüllt ist.
 *
 * Usage: node scripts/seed-apartment-images.mjs
 *
 * Idempotent: bereits übernommene Fotos (storage_path "seed/<slug>/<datei>")
 * werden übersprungen. Vorhandene (z.B. selbst hochgeladene) Fotos bleiben
 * unangetastet; Standard-Fotos werden dahinter angehängt.
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
const supabase = createClient(
  e.NEXT_PUBLIC_SUPABASE_URL,
  e.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const BUCKET = "apartment-images";

// slug + Bild-Reihenfolge aus apartments.ts parsen (Reihenfolge bleibt erhalten).
const src = readFileSync("src/data/apartments.ts", "utf-8");
const slugs = [...src.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const imageBlocks = [...src.matchAll(/images:\s*\[([\s\S]*?)\]/g)].map((m) =>
  [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
);

if (slugs.length !== imageBlocks.length) {
  console.error(`Parse-Fehler: ${slugs.length} slugs, ${imageBlocks.length} Bildblöcke.`);
  process.exit(1);
}

const ctypes = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

let added = 0;
let skipped = 0;

for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];
  const paths = imageBlocks[i];

  // Bestehende Fotos der Wohnung laden (für Dedup + nächste sort_order).
  const { data: existing } = await supabase
    .from("apartment_images")
    .select("storage_path, sort_order")
    .eq("apartment_id", slug);
  const existingPaths = new Set((existing ?? []).map((r) => r.storage_path));
  let nextOrder =
    (existing ?? []).reduce((max, r) => Math.max(max, Number(r.sort_order)), -1) + 1;

  for (const publicPath of paths) {
    const fileName = publicPath.split("/").pop();
    const storagePath = `seed/${slug}/${fileName}`;
    if (existingPaths.has(storagePath)) {
      skipped++;
      continue;
    }
    let buf;
    try {
      buf = readFileSync(`public${publicPath}`);
    } catch {
      console.warn(`  ⚠ Datei fehlt, übersprungen: public${publicPath}`);
      continue;
    }
    const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: ctypes[ext] || "image/jpeg", upsert: true });
    if (upErr) {
      console.error(`  ✗ Upload ${storagePath}: ${upErr.message}`);
      continue;
    }
    const { error: insErr } = await supabase
      .from("apartment_images")
      .insert({ apartment_id: slug, storage_path: storagePath, sort_order: nextOrder });
    if (insErr) {
      console.error(`  ✗ DB ${storagePath}: ${insErr.message}`);
      continue;
    }
    nextOrder++;
    added++;
    console.log(`  + ${slug}: ${fileName}`);
  }
}

console.log(`\n✅ Fertig. ${added} Foto(s) übernommen, ${skipped} bereits vorhanden (übersprungen).`);
