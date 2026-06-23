"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  finalizeInvoice,
  createStornoDocument,
  createCorrectionDocument,
} from "@/app/(admin)/admin/actions";

interface SnapshotDiffRow {
  field: string;
  snapshot: string;
  current: string;
}

interface InvoiceDocument {
  id: string;
  type: "storno" | "correction";
  number: string;
  issue_date: string;
  related_invoice_number: string;
  reason: string | null;
}

interface InvoiceSectionProps {
  bookingId: string;
  invoiceNumber: string | null;
  invoiceFinalizedAt: string | null;
  invoiceCancelledAt: string | null;
  previousInvoiceNumber: string | null;
  status: string;
  diffs: SnapshotDiffRow[];
  invoiceSnapshotTotal: number | null;
  currentTotal: number;
  documents: InvoiceDocument[];
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(n);
}

export default function InvoiceSection({
  bookingId,
  invoiceNumber,
  invoiceFinalizedAt,
  invoiceCancelledAt,
  previousInvoiceNumber,
  status,
  diffs,
  invoiceSnapshotTotal,
  currentTotal,
  documents,
}: InvoiceSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isFinalized = !!invoiceFinalizedAt;
  const hasDiffs = diffs.length > 0;
  const isLegacyCancelled = !isFinalized && !!invoiceCancelledAt;
  const isBookingConfirmed = status === "confirmed" || status === "completed";
  const hasStorno = documents.some((d) => d.type === "storno");

  const handleFinalize = () => {
    if (!confirm("Rechnung jetzt erstellen? Die aktuellen Buchungsdaten werden eingefroren — Änderungen danach erfordern eine Storno- oder Korrekturrechnung.")) return;
    startTransition(async () => {
      const r = await finalizeInvoice(bookingId);
      if (r.success) {
        setMessage({ type: "success", text: "Rechnung erstellt" });
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: r.error || "Fehler" });
      }
    });
  };

  const handleStorno = () => {
    const reason = prompt(
      "Grund der Stornierung (erscheint auf der Stornorechnung):",
      "Buchung storniert"
    );
    if (reason === null) return;
    startTransition(async () => {
      const r = await createStornoDocument(bookingId, reason);
      if (r.success) {
        setMessage({ type: "success", text: `Stornorechnung ${r.number} erstellt` });
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: r.error || "Fehler" });
      }
    });
  };

  const handleCorrection = () => {
    const reason = prompt(
      "Grund der Korrektur (erscheint auf der Rechnungskorrektur):",
      "Betragskorrektur"
    );
    if (reason === null) return;
    startTransition(async () => {
      const r = await createCorrectionDocument(bookingId, reason);
      if (r.success) {
        setMessage({ type: "success", text: `Rechnungskorrektur ${r.number} erstellt` });
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: r.error || "Fehler" });
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-900 text-sm">Rechnung</h3>
      </div>
      <div className="p-5 space-y-3">
        {!isBookingConfirmed && !isFinalized && (
          <p className="text-sm text-stone-500">
            Buchung muss erst bestätigt werden, bevor eine Rechnung erstellt werden kann.
          </p>
        )}

        {/* Noch nicht ausgestellt */}
        {isBookingConfirmed && !isFinalized && !isLegacyCancelled && (
          <>
            {invoiceNumber && (
              <div className="text-sm">
                <span className="text-stone-500">Rechnungsnummer:</span>{" "}
                <span className="font-medium text-stone-900">{invoiceNumber}</span>
              </div>
            )}
            <p className="text-sm text-stone-500">
              Status: <span className="text-amber-700 font-medium">noch nicht ausgestellt</span>
            </p>
            <button
              onClick={handleFinalize}
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isPending ? "Erstelle..." : "Rechnung erstellen"}
            </button>
            <p className="text-[11px] text-stone-400">
              Friert den aktuellen Buchungsstand als Rechnung ein.
            </p>
          </>
        )}

        {/* Ausgestellt (inkl. evtl. Storno/Korrektur) */}
        {isFinalized && (
          <>
            {hasStorno && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm">
                <p className="font-semibold text-red-800">Rechnung wurde storniert</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Das Original bleibt aus rechtlichen Gründen erhalten; die Stornorechnung dokumentiert die Aufhebung.
                </p>
              </div>
            )}

            {hasDiffs && !hasStorno && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-amber-800 mb-1">
                  ⚠ Rechnung weicht von aktuellen Buchungsdaten ab
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  Die ausgestellte Rechnung zeigt nicht mehr den aktuellen Stand. Erstelle eine
                  <strong> Rechnungskorrektur</strong> (das Original darf nicht überschrieben werden).
                </p>
                <ul className="text-xs text-amber-900 space-y-0.5 ml-3 list-disc">
                  {diffs.map((d) => (
                    <li key={d.field}>
                      <strong>{d.field}:</strong> Rechnung {d.snapshot} → aktuell {d.current}
                    </li>
                  ))}
                </ul>
                {invoiceSnapshotTotal !== null && (
                  <p className="text-xs text-amber-800 mt-2">
                    Total Rechnung: <strong>{fmtMoney(invoiceSnapshotTotal)}</strong> · aktuell:{" "}
                    <strong>{fmtMoney(currentTotal)}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="text-sm">
              <span className="text-stone-500">Rechnungsnummer:</span>{" "}
              <span className="font-medium text-stone-900">{invoiceNumber}</span>
            </div>
            <p className="text-xs text-stone-500">Erstellt am {fmtDateTime(invoiceFinalizedAt!)}</p>

            <a
              href={`/api/invoice/${bookingId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 px-4 bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Rechnung herunterladen
            </a>

            {/* Folgedokumente */}
            {documents.length > 0 && (
              <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800">
                        {d.type === "storno" ? "Stornorechnung" : "Rechnungskorrektur"} {d.number}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
                        zu {d.related_invoice_number}
                        {d.reason ? ` · ${d.reason}` : ""}
                      </p>
                    </div>
                    <a
                      href={`/api/admin/invoice-document/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#c8a96e] hover:text-[#b89555] underline flex-shrink-0"
                    >
                      PDF
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Aktionen — nur solange nicht storniert */}
            {!hasStorno && (
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleCorrection}
                  disabled={isPending}
                  className="w-full py-2 px-4 border border-amber-300 text-amber-800 hover:bg-amber-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isPending ? "..." : "Rechnungskorrektur erstellen"}
                </button>
                <button
                  onClick={handleStorno}
                  disabled={isPending}
                  className="w-full py-2 px-4 border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isPending ? "..." : "Stornorechnung erstellen"}
                </button>
                <p className="text-[11px] text-stone-400">
                  Storno & Korrektur sind eigenständige Belege mit eigener Nummer und Verweis auf das
                  Original. Ausgestellte Rechnungen werden nicht gelöscht.
                </p>
              </div>
            )}
          </>
        )}

        {/* Legacy: alt-storniert (vor Einführung der Folgedokumente) */}
        {isLegacyCancelled && (
          <>
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm">
              <p className="font-semibold text-red-800">Rechnung storniert</p>
              {previousInvoiceNumber && (
                <p className="text-xs text-red-700 mt-1">
                  Stornierte Nummer{previousInvoiceNumber.includes(";") ? "n" : ""}: {previousInvoiceNumber}
                </p>
              )}
              {invoiceCancelledAt && (
                <p className="text-xs text-red-700">am {fmtDateTime(invoiceCancelledAt)}</p>
              )}
            </div>
            <button
              onClick={handleFinalize}
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isPending ? "..." : "Neue Rechnung erstellen"}
            </button>
          </>
        )}

        {message && (
          <p className={`text-xs ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
