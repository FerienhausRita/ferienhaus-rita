"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/ui/Container";

export default function MeineBuchungPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/guest-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), lastName: lastName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten");
        return;
      }

      if (data.success && data.bookingId) {
        router.push(`/meine-buchung/${data.bookingId}`);
      }
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
              Meine Buchung
            </h1>
            <p className="text-lg text-stone-500">
              Geben Sie Ihren Buchungscode und Nachnamen ein, um Ihre
              Buchungsdetails einzusehen.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  Buchungscode
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="z.B. a1b2c3d4"
                  maxLength={8}
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-alpine-500 focus:ring-2 focus:ring-alpine-500/20 outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  Nachname
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ihr Nachname"
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-alpine-500 focus:ring-2 focus:ring-alpine-500/20 outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code || !lastName}
                className="w-full rounded-xl bg-alpine-600 px-6 py-3 text-white font-medium hover:bg-alpine-700 focus:ring-2 focus:ring-alpine-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Wird geladen..." : "Buchung aufrufen"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-stone-400">
              Den Buchungscode finden Sie in Ihrer Bestätigungsmail.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
