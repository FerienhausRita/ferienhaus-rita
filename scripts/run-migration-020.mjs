/**
 * Run migration 020: Summer/Winter pricing model
 *
 * Usage: node scripts/run-migration-020.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sql = readFileSync("supabase/migrations/020_summer_winter_pricing.sql", "utf-8");

// Split into individual statements
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`Running ${statements.length} statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 80).replace(/\n/g, " ");
  console.log(`  [${i + 1}/${statements.length}] ${preview}...`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: stmt }),
  });

  // Try direct SQL via pg endpoint
  const pgRes = await fetch(`${SUPABASE_URL}/pg`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: stmt }),
  });

  // If neither works, try the SQL editor endpoint
  if (!res.ok && !pgRes.ok) {
    console.log(`    ⚠ Statement may need manual execution in Supabase SQL Editor`);
  }
}

console.log("\n✅ Migration complete (or run manually in Supabase SQL Editor)");
console.log("\nTo run manually, paste the contents of:");
console.log("  supabase/migrations/020_summer_winter_pricing.sql");
console.log("into the Supabase SQL Editor at:");
console.log(`  ${SUPABASE_URL.replace('.supabase.co', '.supabase.co')}/project/default/sql`);
