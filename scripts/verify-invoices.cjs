/**
 * Plausibilitätsprüfung der zentralen Rechnungs-Zahlungslogik (Spec §14).
 * Lädt src/lib/invoice-payment.ts via TypeScript-Transpile (keine Extra-Deps),
 * prüft die 10 Referenzfälle: korrekte Beträge, Status, Plattform, QR/Bank-Sichtbarkeit,
 * keine erneute Zahlungsaufforderung bei bezahlten Rechnungen, Rundungs-Konsistenz.
 *
 * Ausführen: node scripts/verify-invoices.cjs
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const src = fs.readFileSync(path.join(__dirname, "../src/lib/invoice-payment.ts"), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: "commonjs", target: "es2019" },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", js)(mod, mod.exports);
const { deriveInvoicePayment, checkInvoiceConsistency, showsGiroCode } = mod.exports;

const r2 = (n) => Math.round(n * 100) / 100;
// Breakdown genau wie die Vorlage: net + USt = steuerpfl. Brutto, + Ortstaxe = Total.
function breakdown(total, localTax, rate = 0.1) {
  const vatLiableGross = r2(total - localTax);
  const vat = r2((vatLiableGross / (1 + rate)) * rate);
  const net = r2(vatLiableGross - vat);
  return { net, vat, localTax, positionsSum: total };
}

const failures = [];
function check(name, cond, detail) {
  if (!cond) failures.push(`❌ ${name}: ${detail}`);
}

function run(name, booking, payments, opts, expect) {
  const pay = deriveInvoicePayment(booking, payments || [], opts || {});
  check(name, pay.status === expect.status, `status=${pay.status}, erwartet ${expect.status}`);
  if (expect.outstanding != null)
    check(name, r2(pay.amountOutstanding) === expect.outstanding, `outstanding=${pay.amountOutstanding}, erwartet ${expect.outstanding}`);
  if (expect.paid != null)
    check(name, r2(pay.amountPaid) === expect.paid, `paid=${pay.amountPaid}, erwartet ${expect.paid}`);
  if (expect.provider !== undefined)
    check(name, pay.provider === expect.provider, `provider=${pay.provider}, erwartet ${expect.provider}`);
  if (expect.qr != null)
    check(name, showsGiroCode(pay) === expect.qr, `QR/Bank=${showsGiroCode(pay)}, erwartet ${expect.qr}`);
  // Keine erneute Zahlungsaufforderung bei bezahlt/storniert:
  if (pay.status === "paid" || pay.status === "cancelled")
    check(name, !showsGiroCode(pay), "bezahlt/storniert darf keinen QR/Bank zeigen");
  // Rundungs-/Betragskonsistenz:
  const localTax = opts && opts.localTax != null ? opts.localTax : 0;
  const errs = checkInvoiceConsistency(pay, breakdown(pay.total, localTax));
  check(name, errs.length === 0, `Konsistenz: ${errs.join("; ")}`);
  return pay;
}

// 1) offene Direktbuchung
run("1 offene Direktbuchung", { total_price: 600, payment_status: "unpaid", source_channel: "Website" }, [], {},
  { status: "open", outstanding: 600, paid: 0, provider: null, qr: true });

// 2) vollständig bezahlte Direktbuchung
run("2 bezahlte Direktbuchung", { total_price: 600, payment_status: "paid", source_channel: "Website" },
  [{ amount: 600, paid_at: "2026-07-10", applies_to: "deposit" }], {},
  { status: "paid", outstanding: 0, paid: 600, provider: null, qr: false });

// 3) über Booking.com vollständig bezahlt (platform_pending = Plattform hat kassiert)
run("3 Booking.com bezahlt", { total_price: 600, payment_status: "platform_pending", source_channel: "Booking.com" }, [], {},
  { status: "paid", outstanding: 0, paid: 600, provider: "Booking.com", qr: false });

// 3b) Booking.com mit bestätigter Auszahlung + Datum
{
  const pay = run("3b Booking.com payout confirmed",
    { total_price: 600, payment_status: "paid", payout_confirmed_at: "2026-07-13T10:00:00Z", source_channel: "Booking.com" }, [], {},
    { status: "paid", outstanding: 0, provider: "Booking.com", qr: false });
  check("3b Datum", pay.paymentDate === "2026-07-13", `paymentDate=${pay.paymentDate}`);
}

// 4) über Airbnb vollständig bezahlt
run("4 Airbnb bezahlt", { total_price: 480, payment_status: "platform_pending", source_channel: "Airbnb" }, [], {},
  { status: "paid", outstanding: 0, paid: 480, provider: "Airbnb", qr: false });

// 5) über Plattform vermittelt, aber NOCH UNBEZAHLT (Gast zahlt Haus) → offen, QR an
run("5 Plattform vermittelt, unbezahlt", { total_price: 600, payment_status: "unpaid", source_channel: "Airbnb" }, [], {},
  { status: "open", outstanding: 600, paid: 0, provider: null, qr: true });

// 6) teilweise bezahlt (Anzahlung geleistet)
run("6 teilweise bezahlt", {
  total_price: 600, payment_status: "deposit_paid", source_channel: "Website",
  deposit_amount: 180, deposit_paid_at: "2026-07-01", remainder_amount: 420,
}, [{ amount: 180, paid_at: "2026-07-01", applies_to: "deposit" }], {},
  { status: "partially_paid", outstanding: 420, paid: 180, provider: null, qr: true });

// 7) stornierte Rechnung (Storno-Dokument)
run("7 storniert", { total_price: 600, payment_status: "unpaid", source_channel: "Website" }, [], { documentType: "storno" },
  { status: "cancelled", outstanding: 0, qr: false });

// 8) Rechnung mit gesondert offener Ortstaxe (Ortstaxe NICHT im Total) → offen
run("8 offene Ortstaxe separat", { total_price: 600, payment_status: "unpaid", source_channel: "Website" }, [], { localTax: 0 },
  { status: "open", outstanding: 600, qr: true });

// 9) Rechnung mit vollständig bezahlter Ortstaxe (Ortstaxe IM Total, bezahlt)
run("9 Ortstaxe im Total, bezahlt", { total_price: 632, payment_status: "paid", source_channel: "Website" },
  [{ amount: 632, paid_at: "2026-07-05" }], { localTax: 32 },
  { status: "paid", outstanding: 0, paid: 632, qr: false });

// 10) Rundungsdifferenzen — krummer Betrag, Konsistenz muss halten
run("10 Rundung", { total_price: 100.05, payment_status: "unpaid", source_channel: "Website" }, [], { localTax: 0 },
  { status: "open", outstanding: 100.05, qr: true });

// 10b) Gegenprobe: die Konsistenzprüfung MUSS einen echten Widerspruch erkennen
{
  const pay = deriveInvoicePayment({ total_price: 600, payment_status: "unpaid" }, [], {});
  const errs = checkInvoiceConsistency(pay, { net: 500, vat: 50, localTax: 0 }); // 550 != 600
  check("10b Konsistenz erkennt Fehler", errs.length > 0, "Widerspruch wurde NICHT erkannt");
}

if (failures.length) {
  console.error(`\n${failures.length} FEHLER:\n` + failures.join("\n"));
  process.exit(1);
}
console.log("✅ Alle 12 Rechnungs-Plausibilitätsprüfungen bestanden.");
