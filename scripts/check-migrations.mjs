/**
 * Prüft, ob die Migrationen 024-030 in der Supabase-DB angekommen sind.
 * Liest Schema-Info via service-role-key.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Manuelles dotenv (vermeidet zusätzliche Dependency)
try {
  const env = readFileSync(".env.local", "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env.local not present — fine
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const checks = [];

// 024(b): guests.admin_rating + admin_notes
{
  const { error } = await supabase
    .from("guests")
    .select("admin_rating, admin_notes")
    .limit(1);
  checks.push({
    migration: "024",
    item: "guests.admin_rating / admin_notes",
    ok: !error,
    err: error?.message,
  });
}

// 024(a): site_settings.bank_details has account_holder (no holder)
{
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .maybeSingle();
  if (error) {
    checks.push({ migration: "024(a)", item: "bank_details", ok: false, err: error.message });
  } else if (!data) {
    checks.push({ migration: "024(a)", item: "bank_details", ok: false, err: "row missing" });
  } else {
    const v = data.value || {};
    const hasNew = "account_holder" in v;
    const hasOld = "holder" in v;
    checks.push({
      migration: "024(a)",
      item: "bank_details key=account_holder",
      ok: hasNew && !hasOld,
      err: hasOld ? "still has 'holder' key" : !hasNew ? "no account_holder key" : null,
      info: `keys: ${Object.keys(v).join(", ")}`,
    });
  }
}

// 024(c): email_schedule constraint includes admin_notes_7d/3d
// We probe by inserting a dummy with that type would fail without the migration.
// Instead, we just check pg_constraint via RPC if available; fallback: skip.
// Stattdessen: prüfen wir via try-insert + rollback (hier weglassen, indirekter Check).

// 025: tax_config.included exists, local_tax = false
{
  const { data, error } = await supabase
    .from("tax_config")
    .select("key, included")
    .eq("key", "local_tax")
    .maybeSingle();
  if (error?.message?.match(/included/i)) {
    checks.push({ migration: "025", item: "tax_config.included", ok: false, err: "column missing" });
  } else if (error) {
    checks.push({ migration: "025", item: "tax_config.included", ok: false, err: error.message });
  } else {
    checks.push({
      migration: "025",
      item: "tax_config.local_tax.included",
      ok: data?.included === false,
      info: `value: ${data?.included}`,
    });
  }
}

// 026: apartment_pricing has new columns
{
  const { data, error } = await supabase
    .from("apartment_pricing")
    .select("apartment_id, extra_adult_price, extra_child_price, first_dog_fee, additional_dog_fee")
    .limit(1);
  if (error) {
    checks.push({ migration: "026", item: "apartment_pricing new cols", ok: false, err: error.message });
  } else {
    const row = data?.[0];
    const allSet =
      row &&
      row.extra_adult_price != null &&
      row.extra_child_price != null &&
      row.first_dog_fee != null &&
      row.additional_dog_fee != null;
    checks.push({
      migration: "026",
      item: "apartment_pricing extra_adult/child/first_dog/additional_dog",
      ok: !!allSet,
      info: row ? JSON.stringify(row) : "no rows",
    });
  }
}

// 027: email_schedule constraint includes admin_payment_check_7d
// Attempt insert with the new type and rollback (delete by id)
{
  const fakeBookingId = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabase
    .from("email_schedule")
    .insert({
      booking_id: fakeBookingId,
      email_type: "admin_payment_check_7d",
      scheduled_for: "2099-01-01T00:00:00Z",
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error) {
    // FK error or check error? CHECK violation = constraint missing.
    const msg = error.message || "";
    if (msg.includes("admin_payment_check_7d") || msg.includes("email_type") || msg.includes("violates check")) {
      checks.push({ migration: "027", item: "email_type admin_payment_check_7d", ok: false, err: msg });
    } else {
      // FK violation expected (booking doesn't exist) — that means CHECK passed
      const fkOk = msg.includes("foreign key") || msg.includes("violates");
      checks.push({
        migration: "027",
        item: "email_type admin_payment_check_7d",
        ok: fkOk,
        info: fkOk ? "(FK error → CHECK passed)" : msg,
      });
    }
  } else {
    // Inserted successfully → cleanup
    if (data?.id) {
      await supabase.from("email_schedule").delete().eq("id", data.id);
    }
    checks.push({ migration: "027", item: "email_type admin_payment_check_7d", ok: true });
  }
}

// 028: waitlist table exists
{
  const { error } = await supabase.from("waitlist").select("id").limit(1);
  checks.push({
    migration: "028",
    item: "waitlist table",
    ok: !error,
    err: error?.message,
  });
}

// 029: extra_child_price === extra_adult_price
{
  const { data } = await supabase
    .from("apartment_pricing")
    .select("apartment_id, extra_adult_price, extra_child_price");
  const mismatched = (data ?? []).filter(
    (r) => Number(r.extra_adult_price) !== Number(r.extra_child_price)
  );
  checks.push({
    migration: "029",
    item: "extra_child_price = extra_adult_price",
    ok: mismatched.length === 0,
    info: mismatched.length > 0 ? `mismatched: ${JSON.stringify(mismatched)}` : "all match",
  });
}

// 030: bookings.infants exists
{
  const { error } = await supabase.from("bookings").select("infants").limit(1);
  checks.push({
    migration: "030",
    item: "bookings.infants",
    ok: !error,
    err: error?.message,
  });
}

console.log("\nMigrations status:\n");
for (const c of checks) {
  const sign = c.ok ? "✓" : "✗";
  const extra = c.err ? ` — ${c.err}` : c.info ? ` — ${c.info}` : "";
  console.log(`${sign}  ${c.migration}  ${c.item}${extra}`);
}
console.log("");

const failed = checks.filter((c) => !c.ok).length;
process.exit(failed > 0 ? 1 : 0);
