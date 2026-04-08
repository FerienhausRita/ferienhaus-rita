"use client";

import { useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  // Check for error param (unauthorized)
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const unauthorizedError = searchParams?.get("error") === "unauthorized";

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#c8a96e] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif text-2xl font-bold">
              FR
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Ferienhaus Rita
          </h1>
          <p className="text-stone-500 text-sm mt-1">Admin-Dashboard</p>
        </div>

        {/* Error for unauthorized users */}
        {unauthorizedError && status === "idle" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Ihr Konto hat keinen Admin-Zugang. Bitte kontaktieren Sie den
            Administrator.
          </div>
        )}

        {/* Success state */}
        {status === "success" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="font-semibold text-stone-900 text-lg mb-2">
              E-Mail gesendet!
            </h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              Wir haben einen Login-Link an{" "}
              <strong className="text-stone-900">{email}</strong> gesendet.
              Bitte prüfen Sie Ihren Posteingang.
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
              className="mt-6 text-sm text-[#c8a96e] hover:text-[#b89555] font-medium"
            >
              Andere E-Mail verwenden
            </button>
          </div>
        ) : (
          /* Login form */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8"
          >
            <h2 className="font-semibold text-stone-900 text-lg mb-1">
              Anmelden
            </h2>
            <p className="text-stone-500 text-sm mb-6">
              Geben Sie Ihre E-Mail ein, um einen Login-Link zu erhalten.
            </p>

            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@beispiel.at"
              required
              autoFocus
              autoComplete="email"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50 transition-colors"
            />

            {status === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full mt-4 py-3 px-4 bg-[#c8a96e] hover:bg-[#b89555] disabled:bg-stone-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Wird gesendet...
                </>
              ) : (
                "Magic Link senden"
              )}
            </button>
          </form>
        )}

        <p className="text-center text-stone-400 text-xs mt-6">
          Nur für autorisierte Familienmitglieder
        </p>
      </div>
    </div>
  );
}
