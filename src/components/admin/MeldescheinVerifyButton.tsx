"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyMeldeschein } from "@/app/(admin)/admin/actions";

export default function MeldescheinVerifyButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    if (!confirm("Meldeschein als geprüft markieren?")) return;
    setLoading(true);
    try {
      const result = await verifyMeldeschein(bookingId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Fehler");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleVerify}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {loading ? "Wird geprüft..." : "Als geprüft markieren"}
    </button>
  );
}
