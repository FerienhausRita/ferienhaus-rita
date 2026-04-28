"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  finalizeInvoice,
  cancelInvoice,
} from "@/app/(admin)/admin/actions";

interface SnapshotDiffRow {
  field: string;
  snapshot: string;
  current: string;
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
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(n);
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
}: InvoiceSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isFinalized = !!invoiceFinalizedAt;
  const hasDiffs = diffs.length > 0;
  const isCancelled = !isFinalized && !!invoiceCancelledAt;
  const isBookingConfirmed = status === "confirmed" || status === "completed";

  const handleFinalize = () => {
    if (!confirm("Rechnung jetzt erstellen? Die aktuellen Buchungsdaten werden eingefroren — spätere Änderungen erfordern eine Stornierung.")) return;
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

  const handleCancel = () => {
    if (
      !confirm(
        "Rechnung wirklich stornieren? Die aktuelle Rechnungsnummer wird archiviert. Beim nächsten Erstellen wird eine neue Nummer vergeben."
      )
    )
      return;
    startTransition(async () => {
      const r = await cancelInvoice(bookingId);
      if (r.success) {
        setMessage({ type: "success", text: "Rechnung storniert" });
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: r.error || "Fehler" });
      }
    });
  };

  // Zustand bestimmen
  let state: "not_confirmed" | "ready" | "issued" | "diff" | "cancelled";
  if (!isBookingConfirmed) state = "not_confirmed";
  else if (isFinalized && hasDiffs) state = "diff";
  else if (isFinalized) state = "issued";
  else if (isCancelled) state = "cancelled";
  else state = "ready";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-900 text-sm">Rechnung</h3>
      </div>
      <div className="p-5 space-y-3">
        {state === "not_confirmed" && (
          <p className="text-sm text-stone-500">
            Buchung muss erst bestätigt werden, bevor eine Rechnung erstellt werden kann.
          </p>
        )}

        {state === "ready" && (
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

        {state === "issued" && (
          <>
            <div className="text-sm">
              <span className="text-stone-500">Rechnungsnummer:</span>{" "}
              <span className="font-medium text-stone-900">{invoiceNumber}</span>
            </div>
            <p className="text-xs text-stone-500">
              Erstellt am {fmtDateTime(invoiceFinalizedAt!)}
            </p>
            <a
              href={`/api/invoice/${bookingId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 px-4 bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Rechnung herunterladen
            </a>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="w-full py-2 px-3 text-xs text-stone-500 hover:text-red-600 hover:bg-stone-50 rounded-lg transition-colors"
            >
              {isPending ? "..." : "Rechnung stornieren"}
            </button>
          </>
        )}

        {state === "diff" && (
          <>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-800 mb-1">
                ⚠ Rechnung weicht von aktuellen Buchungsdaten ab
              </p>
              <p className="text-xs text-amber-700 mb-2">
                Die ausgestellte Rechnung zeigt nicht mehr den aktuellen Stand. Bitte stornieren und neu erstellen.
              </p>
              <ul className="text-xs text-amber-900 space-y-0.5 ml-3 list-disc">
                {diffs.map((d) => (
                  <li key={d.field}>
                    <strong>{d.field}:</strong> Rechnung {d.snapshot} → aktuell {d.current}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-sm">
              <span className="text-stone-500">Rechnungsnummer:</span>{" "}
              <span className="font-medium text-stone-900">{invoiceNumber}</span>
            </div>
            <p className="text-xs text-stone-500">
              Erstellt am {fmtDateTime(invoiceFinalizedAt!)}
            </p>
            {invoiceSnapshotTotal !== null && (
              <p className="text-xs text-stone-500">
                Total Rechnung: <strong>{fmtMoney(invoiceSnapshotTotal)}</strong> · aktuell: <strong>{fmtMoney(currentTotal)}</strong>
              </p>
            )}
            <a
              href={`/api/invoice/${bookingId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 px-3 text-sm font-medium text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Rechnung (alter Stand) herunterladen
            </a>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isPending ? "..." : "Stornieren & neu erstellen"}
            </button>
          </>
        )}

        {state === "cancelled" && (
          <>
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm">
              <p className="font-semibold text-red-800">Rechnung storniert</p>
              {previousInvoiceNumber && (
                <p className="text-xs text-red-700 mt-1">
                  Stornierte Nummer{previousInvoiceNumber.includes(";") ? "n" : ""}: {previousInvoiceNumber}
                </p>
              )}
              {invoiceCancelledAt && (
                <p className="text-xs text-red-700">
                  am {fmtDateTime(invoiceCancelledAt)}
                </p>
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
          <p
            className={`text-xs ${
              message.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
