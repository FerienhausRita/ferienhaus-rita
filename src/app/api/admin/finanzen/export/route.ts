import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function bounds(year: number, month: number | null) {
  if (month && month >= 1 && month <= 12) {
    const last = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, "0");
    return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2, "0")}` };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const de = (n: number) => r2(n).toFixed(2).replace(".", ",");
function csvCell(v: string | number) {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const auth = createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await auth.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : null;
  const { start, end } = bounds(year, month);

  const supabase = createServerClient();
  const incomeVatRate = 10; // Beherbergung; Extras ggf. abweichend (Steuerberater)

  // Einnahmen: tatsächliche Zahlungen + bestätigte Plattform-Auszahlungen
  const { data: payments } = await supabase
    .from("booking_payments")
    .select("amount, method, paid_at, applies_to, booking_id")
    .gte("paid_at", start)
    .lte("paid_at", end);

  const bookingIds = [...new Set((payments ?? []).map((p) => p.booking_id as string))];
  const bookingMap = new Map<string, { name: string; channel: string }>();
  if (bookingIds.length) {
    const { data: bks } = await supabase
      .from("bookings")
      .select("id, first_name, last_name, source_channel")
      .in("id", bookingIds);
    for (const b of bks ?? [])
      bookingMap.set(b.id as string, {
        name: [b.first_name, b.last_name].filter(Boolean).join(" "),
        channel: (b.source_channel as string) || "Website",
      });
  }

  const payoutRes = await supabase
    .from("bookings")
    .select("payout_amount, payout_confirmed_at, first_name, last_name, source_channel")
    .not("payout_amount", "is", null)
    .gte("payout_confirmed_at", start)
    .lte("payout_confirmed_at", `${end}T23:59:59`);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("expense_date, category, amount, net_amount, vat_rate, vat_amount, payment_method, note, receipt_path")
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: true });

  const header = [
    "Datum", "Typ", "Beschreibung", "Kategorie/Kanal", "Zahlart",
    "Brutto", "Netto", "USt-Satz", "USt-Betrag", "Referenz", "Beleg",
  ];
  const lines: string[] = [header.join(";")];

  for (const p of (payments ?? []).sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)))) {
    const gross = Number(p.amount || 0);
    const net = r2(gross / (1 + incomeVatRate / 100));
    const info = bookingMap.get(p.booking_id as string);
    lines.push([
      p.paid_at, "Einnahme",
      `Zahlung (${p.applies_to === "remainder" ? "Restbetrag" : "Anzahlung"})`,
      info?.channel ?? "", p.method ?? "",
      de(gross), de(net), `${incomeVatRate}%`, de(gross - net),
      info?.name ?? "", "",
    ].map(csvCell).join(";"));
  }

  for (const b of payoutRes.data ?? []) {
    const gross = Number(b.payout_amount || 0);
    const net = r2(gross / (1 + incomeVatRate / 100));
    lines.push([
      String(b.payout_confirmed_at).slice(0, 10), "Einnahme", "Plattform-Auszahlung (netto)",
      (b.source_channel as string) || "", "Plattform",
      de(gross), de(net), `${incomeVatRate}%`, de(gross - net),
      [b.first_name, b.last_name].filter(Boolean).join(" "), "",
    ].map(csvCell).join(";"));
  }

  for (const e of expenses ?? []) {
    const gross = Number(e.amount || 0);
    const rate = e.vat_rate != null ? Number(e.vat_rate) : null;
    const net = e.net_amount != null ? Number(e.net_amount) : rate != null ? r2(gross / (1 + rate / 100)) : gross;
    const vat = e.vat_amount != null ? Number(e.vat_amount) : r2(gross - net);
    lines.push([
      e.expense_date, "Ausgabe", e.note || (e.category as string),
      e.category as string, e.payment_method ?? "",
      de(gross), de(net), rate != null ? `${rate}%` : "", de(vat),
      "", e.receipt_path ? "ja" : "nein",
    ].map(csvCell).join(";"));
  }

  const csv = "﻿" + lines.join("\r\n");
  const label = month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="buchhaltung-${label}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
