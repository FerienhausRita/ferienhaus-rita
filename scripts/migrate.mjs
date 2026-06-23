/**
 * Migrations-Runner für Supabase/Postgres.
 *
 * Wendet alle nummerierten SQL-Dateien aus supabase/migrations/ an, die noch
 * nicht in der Tracking-Tabelle `_migrations` stehen — in numerischer Reihenfolge,
 * jede in einer Transaktion. Bereits gelaufene werden übersprungen.
 *
 * Voraussetzung: SUPABASE_DB_URL in .env.local
 *   (Supabase → Project Settings → Database → Connection string,
 *    "Session pooler" oder "Direct connection"; enthält das DB-Passwort).
 *
 * Befehle:
 *   node scripts/migrate.mjs                 → wendet alle ausstehenden an
 *   node scripts/migrate.mjs status          → zeigt angewendet / ausstehend
 *   node scripts/migrate.mjs baseline 041    → markiert 001..041 als angewendet
 *                                              OHNE sie auszuführen (Erststart,
 *                                              wenn bereits manuell eingespielt)
 */
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");

function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      env[t.slice(0, i).trim()] = v;
    }
  } catch {
    /* ignore */
  }
  return env;
}

// Nur nummerierte Migrationen (z. B. 041_xyz.sql); FIX_*.sql u. Ä. ausgeschlossen.
function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));
}

const env = { ...loadEnv(join(root, ".env.local")), ...process.env };
const url = env.SUPABASE_DB_URL;
if (!url) {
  console.error("❌ SUPABASE_DB_URL fehlt in .env.local.");
  process.exit(1);
}

const cmd = process.argv[2] || "apply";
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(
  "CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
);

const files = migrationFiles();
const appliedRows = (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name);
const applied = new Set(appliedRows);

if (cmd === "status") {
  for (const f of files) console.log(`${applied.has(f) ? "✅" : "⏳"} ${f}`);
  await client.end();
  process.exit(0);
}

if (cmd === "baseline") {
  const maxNum = parseInt(process.argv[3] || "0");
  if (!maxNum) {
    console.error("Usage: node scripts/migrate.mjs baseline <maxNumber>");
    await client.end();
    process.exit(1);
  }
  let marked = 0;
  for (const f of files) {
    if (parseInt(f) <= maxNum && !applied.has(f)) {
      await client.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [f]);
      marked++;
    }
  }
  console.log(`✅ Baseline: ${marked} Migration(en) bis ${maxNum} als angewendet markiert (ohne Ausführung).`);
  await client.end();
  process.exit(0);
}

// apply
const pending = files.filter((f) => !applied.has(f));
if (pending.length === 0) {
  console.log("Nichts zu tun — alle Migrationen sind angewendet.");
  await client.end();
  process.exit(0);
}
for (const f of pending) {
  const sql = readFileSync(join(migrationsDir, f), "utf-8");
  process.stdout.write(`→ ${f} … `);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [f]);
    await client.query("COMMIT");
    console.log("OK");
  } catch (e) {
    await client.query("ROLLBACK");
    console.log("FEHLER");
    console.error(`   ${e.message}`);
    await client.end();
    process.exit(1);
  }
}
console.log(`✅ ${pending.length} Migration(en) angewendet.`);
await client.end();
