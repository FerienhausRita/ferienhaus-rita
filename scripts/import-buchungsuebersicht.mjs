/**
 * One-time script: Import bookings from "Buchungsübersicht.xlsx"
 *
 * Parses the multi-sheet Excel file (Wohnung 1-4) and inserts
 * bookings with guest data into the database via Supabase.
 * Also removes matching iCal blocked_dates.
 *
 * Usage:
 *   node scripts/import-buchungsuebersicht.mjs
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import XLSX from "xlsx";

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const FILE_PATH =
  "/Users/manuel/Library/CloudStorage/OneDrive-Persönlich/005.Investments/100.Privat/007.Haus Rita Kals am Großglockner/Buchungen/Buchungsübersicht.xlsx";

const WOHNUNG_MAP = {
  "Wohnung 1": "grossglockner-suite",
  "Wohnung 2": "gletscherblick",
  "Wohnung 3": "almrausch",
  "Wohnung 4": "edelweiss",
};

function excelDateToISO(serial) {
  const d = XLSX.SSF.parse_date_code(serial);
  if (!d) return "";
  return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
}

async function supabaseRequest(path, method, body, { upsert = false } = {}) {
  let prefer = "return=minimal";
  if (method === "POST" && upsert) {
    prefer = "return=representation,resolution=merge-duplicates";
  } else if (method === "POST") {
    prefer = "return=representation";
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }

  if (method === "DELETE") return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Parse the Excel file
const buf = readFileSync(FILE_PATH);
const wb = XLSX.read(buf, { type: "buffer" });

const allRows = [];

for (const [sheetName, apartmentId] of Object.entries(WOHNUNG_MAP)) {
  if (!wb.SheetNames.includes(sheetName)) {
    console.log(`Sheet "${sheetName}" not found, skipping.`);
    continue;
  }

  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length < 6) continue;

    const von = r[0];
    const bis = r[1];
    if (typeof von !== "number" || typeof bis !== "number") continue;

    const checkIn = excelDateToISO(von);
    const checkOut = excelDateToISO(bis);
    if (!checkIn || !checkOut) continue;

    const nights = Number(r[2]) || 0;
    const pricePerNight = Number(r[3]) || 0;
    const zuschlag = Number(r[4]) || 0;
    const gesamt = Number(r[5]) || 0;
    const cleaningFee = Number(r[6]) || 0;
    const name = r[7] ? String(r[7]).trim() : "";
    const adults = Number(r[8]) || 2;
    const children = Number(r[9]) || 0;
    const dogs = Number(r[10]) || 0;
    const email = r[11] ? String(r[11]).trim().split(/[\r\n]/)[0] : "";
    const phone = r[12] ? String(r[12]).trim() : "";
    const comment = r[13] ? String(r[13]).trim() : "";

    // Skip rows without name AND without email
    if (!name && !email) continue;

    // Split name into first/last
    let firstName = "";
    let lastName = name;
    const cleanName = name
      .replace(/^(Familie|Fam\.|Herr|Frau)\s+/i, "")
      .trim();
    const nameParts = cleanName.split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    } else {
      lastName = cleanName;
    }

    allRows.push({
      apartment_id: apartmentId,
      sheet: sheetName,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      adults,
      children,
      dogs,
      price_per_night: pricePerNight,
      extra_guests_total: zuschlag,
      cleaning_fee: cleaningFee,
      total_price: gesamt,
      notes: comment,
    });
  }
}

console.log(`\nParsed ${allRows.length} bookings with guest data:\n`);
for (const row of allRows) {
  console.log(
    `  ${row.sheet.padEnd(12)} ${row.check_in} → ${row.check_out}  ${(row.first_name + " " + row.last_name).padEnd(30)} ${row.email || "(keine E-Mail)"}`
  );
}

console.log(`\n--- Starting import ---\n`);

let imported = 0;
let skipped = 0;
let errors = 0;

for (const row of allRows) {
  try {
    // Check for duplicate (same apartment + dates + email)
    if (row.email) {
      const checkUrl = `bookings?apartment_id=eq.${encodeURIComponent(row.apartment_id)}&check_in=eq.${row.check_in}&check_out=eq.${row.check_out}&email=eq.${encodeURIComponent(row.email)}&select=id&limit=1`;
      const existing = await supabaseRequest(checkUrl, "GET");
      if (existing && existing.length > 0) {
        console.log(`  SKIP (duplicate): ${row.first_name} ${row.last_name} ${row.check_in}`);
        skipped++;
        continue;
      }
    }

    // Upsert guest (only if email exists)
    let guestId = null;
    if (row.email) {
      const guestResult = await supabaseRequest(
        "guests?on_conflict=email",
        "POST",
        {
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone || null,
          country: "AT",
        },
        { upsert: true }
      );
      guestId = guestResult?.[0]?.id || null;
    }

    // Insert booking
    await supabaseRequest("bookings", "POST", {
      apartment_id: row.apartment_id,
      check_in: row.check_in,
      check_out: row.check_out,
      nights: row.nights,
      adults: row.adults,
      children: row.children,
      dogs: row.dogs,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email || `import-${row.check_in}-${row.apartment_id}@placeholder.local`,
      phone: row.phone || "",
      street: "",
      zip: "",
      city: "",
      country: "AT",
      notes: row.notes || "",
      price_per_night: row.price_per_night,
      extra_guests_total: row.extra_guests_total,
      dogs_total: 0,
      cleaning_fee: row.cleaning_fee,
      local_tax_total: 0,
      discount_amount: 0,
      total_price: row.total_price,
      status: "confirmed",
      payment_status: "unpaid",
      guest_id: guestId,
    });

    // Remove matching iCal blocked_dates
    try {
      await supabaseRequest(
        `blocked_dates?apartment_id=eq.${encodeURIComponent(row.apartment_id)}&start_date=eq.${row.check_in}&end_date=eq.${row.check_out}&reason=like.iCal%25`,
        "DELETE"
      );
    } catch {
      // Non-critical
    }

    console.log(`  OK: ${row.first_name} ${row.last_name} (${row.apartment_id}) ${row.check_in} → ${row.check_out}`);
    imported++;
  } catch (err) {
    console.error(`  ERROR: ${row.first_name} ${row.last_name}: ${err.message}`);
    errors++;
  }
}

console.log(`\n--- Import complete ---`);
console.log(`  Imported: ${imported}`);
console.log(`  Skipped:  ${skipped}`);
console.log(`  Errors:   ${errors}`);
