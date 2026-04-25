import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
import { isAvailableDB } from "@/lib/availability-server";
import { sendWaitlistNotification, type WaitlistEntry } from "@/lib/email";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron) return true;
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)
    return true;
  if (!process.env.CRON_SECRET && process.env.NODE_ENV !== "production") return true;
  return false;
}

interface WaitlistRow {
  id: string;
  apartment_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_check_in: string;
  preferred_check_out: string;
  notification_token: string;
  created_at: string;
}

const EXPIRY_DAYS = 90;

async function processWaitlist() {
  const supabase = createServerClient();

  const { data: entries } = await supabase
    .from("waitlist")
    .select("*")
    .eq("status", "active");

  if (!entries || entries.length === 0) {
    return { checked: 0, notified: 0, expired: 0 };
  }

  const apartments = await getAllApartmentsWithPricing();
  const today = new Date().toISOString().split("T")[0];

  let notified = 0;
  let expired = 0;

  for (const entry of entries as WaitlistRow[]) {
    // Expired? (älter als 90 Tage oder Anreise schon vorbei)
    const ageDays = Math.floor(
      (Date.now() - new Date(entry.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (ageDays > EXPIRY_DAYS || entry.preferred_check_out <= today) {
      await supabase
        .from("waitlist")
        .update({ status: "expired" })
        .eq("id", entry.id);
      expired++;
      continue;
    }

    // Bestimme Apartment-Kandidaten: spezifisch oder alle
    const candidates = entry.apartment_id
      ? apartments.filter((a) => a.id === entry.apartment_id)
      : apartments;

    let matchedApt: (typeof apartments)[number] | null = null;
    for (const apt of candidates) {
      const free = await isAvailableDB(
        apt.id,
        entry.preferred_check_in,
        entry.preferred_check_out
      );
      if (free) {
        matchedApt = apt;
        break;
      }
    }

    if (!matchedApt) continue;

    // Notify
    const wlEntry: WaitlistEntry = {
      id: entry.id,
      firstName: entry.first_name,
      lastName: entry.last_name,
      email: entry.email,
      phone: entry.phone,
      preferredCheckIn: entry.preferred_check_in,
      preferredCheckOut: entry.preferred_check_out,
      apartmentId: entry.apartment_id,
      notificationToken: entry.notification_token,
    };
    try {
      await sendWaitlistNotification(wlEntry, matchedApt.name, matchedApt.slug);
      await supabase
        .from("waitlist")
        .update({
          status: "notified",
          notified_at: new Date().toISOString(),
          // Wenn der Eintrag „egal" hatte, jetzt das gefundene Apartment fixieren
          apartment_id: entry.apartment_id ?? matchedApt.id,
        })
        .eq("id", entry.id);
      notified++;
    } catch (e) {
      console.error("Waitlist notify failed for", entry.id, e);
    }
  }

  return { checked: entries.length, notified, expired };
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const stats = await processWaitlist();
    return NextResponse.json({ success: true, ...stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Waitlist cron failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

