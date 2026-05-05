/**
 * Run migration 019_smoobu_integration via Supabase Management API
 * Usage: node scripts/run-migration-019.mjs
 */

const SUPABASE_URL = "https://hqjuslhvsobpninhbpjq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  // Read from .env.local
  const fs = await import("fs");
  const envContent = fs.readFileSync(".env.local", "utf-8");
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (match) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = match[1].trim();
  }
}

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL(sql) {
  // Use PostgREST RPC - we need to create a helper function first
  // Alternative: run individual ALTER statements via a temp RPC
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  return res;
}

// Since we can't run raw SQL via REST, we use individual PostgREST-compatible operations
// For ALTER TABLE, we need the Supabase Management API or pg_net

// Approach: Use the pg_net extension to execute SQL if available,
// otherwise fall back to creating a temporary function

async function createRPCAndRun(sql) {
  // Step 1: Create a temporary RPC function that runs our SQL
  const createFn = `
    CREATE OR REPLACE FUNCTION public._run_migration_019()
    RETURNS void AS $$
    BEGIN
      ${sql.replace(/'/g, "''")}
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // We can't create functions via REST either...
  // The only way is via Supabase Dashboard SQL Editor or psql
  // Let's just verify what we can and instruct the user

  console.log("Checking current state...");

  // Check bookings columns
  const bookingsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?select=id&limit=0`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }
  );

  // Check if smoobu columns exist
  const testRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?select=smoobu_reservation_id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }
  );
  const testText = await testRes.text();

  if (testRes.ok && !testText.includes("does not exist")) {
    console.log("✅ Migration already applied!");
    return true;
  }

  console.log("Migration not yet applied. Running via individual inserts...");

  // We can at least create the smoobu_sync_log table and seed site_settings
  // For ALTER TABLE we need Dashboard

  // Seed smoobu_config in site_settings
  const seedRes = await fetch(
    `${SUPABASE_URL}/rest/v1/site_settings?on_conflict=key`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        key: "smoobu_config",
        value: {
          enabled: false,
          apartment_mapping: {
            "grossglockner-suite": 3240557,
            gletscherblick: 3242967,
            almrausch: 3242977,
            edelweiss: 3242982,
          },
          pricing_source: "local",
          last_sync_at: null,
        },
      }),
    }
  );

  if (seedRes.ok) {
    console.log("✅ smoobu_config seeded in site_settings");
  } else {
    console.log("⚠️  Could not seed site_settings:", await seedRes.text());
  }

  return false;
}

const applied = await createRPCAndRun("");

if (!applied) {
  console.log("\n⚠️  ALTER TABLE statements must be run in the Supabase Dashboard SQL Editor.");
  console.log("Go to: https://supabase.com/dashboard/project/hqjuslhvsobpninhbpjq/sql/new");
  console.log("\nPaste and run this SQL:\n");
  const fs = await import("fs");
  const sql = fs.readFileSync("supabase/migrations/019_smoobu_integration.sql", "utf-8");
  console.log(sql);
}
