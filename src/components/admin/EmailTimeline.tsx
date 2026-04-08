"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  resendScheduledEmail,
  skipScheduledEmail,
} from "@/app/(admin)/admin/actions";

interface EmailScheduleEntry {
  id: string;
  booking_id: string;
  email_type: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface EmailTimelineProps {
  emails: EmailScheduleEntry[];
  bookingId: string;
}

const emailTypeLabels: Record<string, string> = {
  confirmation: "Buchungsbestätigung",
  payment_reminder: "Zahlungserinnerung",
  checkin_info: "Check-in Informationen",
  thankyou: "Danke-E-Mail",
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "pending":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-4 ring-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case "failed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 ring-4 ring-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case "skipped":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-400 ring-4 ring-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l7 7-7 7" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-400 ring-4 ring-white">
          <span className="text-xs">?</span>
        </div>
      );
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "sent": return "Gesendet";
    case "pending": return "Geplant";
    case "failed": return "Fehlgeschlagen";
    case "skipped": return "Übersprungen";
    default: return status;
  }
}

export default function EmailTimeline({ emails, bookingId }: EmailTimelineProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleResend(scheduleId: string) {
    setLoadingId(scheduleId);
    try {
      await resendScheduledEmail(scheduleId);
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSkip(scheduleId: string) {
    setLoadingId(scheduleId);
    try {
      await skipScheduledEmail(scheduleId);
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">E-Mail-Verlauf</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-stone-500">Keine E-Mails geplant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="font-semibold text-stone-900">E-Mail-Verlauf</h2>
      </div>
      <div className="p-5">
        <div className="relative">
          {emails.map((email, index) => {
            const isLast = index === emails.length - 1;
            const isLoading = loadingId === email.id;
            const displayDate = email.status === "sent" && email.sent_at
              ? formatDateTime(email.sent_at)
              : formatDateTime(email.scheduled_for);

            return (
              <div key={email.id} className="relative flex gap-4">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 bottom-0 w-px bg-stone-200" />
                )}

                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">
                  <StatusIcon status={email.status} />
                </div>

                {/* Content */}
                <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">
                        {emailTypeLabels[email.email_type] ?? email.email_type}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {statusLabel(email.status)} &middot; {displayDate}
                      </p>
                      {email.status === "failed" && email.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          Fehler: {email.error_message}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-shrink-0">
                      {email.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleResend(email.id)}
                            disabled={isLoading}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-alpine-600 hover:bg-alpine-700 text-white disabled:opacity-50 transition-colors"
                          >
                            {isLoading ? "..." : "Jetzt senden"}
                          </button>
                          <button
                            onClick={() => handleSkip(email.id)}
                            disabled={isLoading}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-50 transition-colors"
                          >
                            {isLoading ? "..." : "Überspringen"}
                          </button>
                        </>
                      )}
                      {email.status === "failed" && (
                        <button
                          onClick={() => handleResend(email.id)}
                          disabled={isLoading}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? "..." : "Erneut senden"}
                        </button>
                      )}
                      {email.status === "sent" && (
                        <button
                          onClick={() => handleResend(email.id)}
                          disabled={isLoading}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-stone-50 hover:bg-stone-100 text-stone-500 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? "..." : "Erneut senden"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
