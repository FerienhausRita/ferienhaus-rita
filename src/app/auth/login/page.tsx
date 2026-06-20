"use client";

import { useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "reset_sent" | "reset_loading"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const urlError = searchParams?.get("error");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setStatus("error");
        setErrorMessage(
          "E-Mail oder Passwort ist falsch. Beim ersten Mal bitte unten auf Passwort setzen / zurücksetzen tippen."
        );
        return;
      }
      // Session steht — Middleware/Callback-Routing übernimmt das Ziel.
      window.location.assign("/admin");
    } catch {
      setStatus("error");
      setErrorMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setStatus("error");
      setErrorMessage("Bitte zuerst Ihre E-Mail-Adresse eingeben.");
      return;
    }
    setStatus("reset_loading");
    setErrorMessage("");
    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
      });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      setStatus("reset_sent");
    } catch {
      setStatus("error");
      setErrorMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#c8a96e] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif text-2xl font-bold">FR</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Ferienhaus Rita
          </h1>
          <p className="text-stone-500 text-sm mt-1">Admin-Anmeldung</p>
        </div>

        {urlError === "unauthorized" && status === "idle" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Ihr Konto hat keinen Zugang. Bitte kontaktieren Sie den Administrator.
          </div>
        )}
        {urlError === "auth_failed" && status === "idle" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Der Link ist ungültig oder abgelaufen. Bitte erneut anmelden.
          </div>
        )}

        {status === "reset_sent" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="font-semibold text-stone-900 text-lg mb-2">E-Mail gesendet</h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              Wir haben einen Link zum Setzen Ihres Passworts an{" "}
              <strong className="text-stone-900">{email}</strong> gesendet.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-6 text-sm text-[#c8a96e] hover:text-[#b89555] font-medium"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8"
          >
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
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

            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5 mt-4">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50 transition-colors"
            />

            {status === "error" && (
              <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim() || !password}
              className="w-full mt-5 py-3 px-4 bg-[#c8a96e] hover:bg-[#b89555] disabled:bg-stone-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {status === "loading" ? "Anmelden…" : "Anmelden"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={status === "reset_loading"}
              className="w-full mt-3 text-sm text-[#c8a96e] hover:text-[#b89555] font-medium disabled:opacity-50"
            >
              {status === "reset_loading"
                ? "Sende…"
                : "Passwort setzen / zurücksetzen"}
            </button>
          </form>
        )}

        <p className="text-center text-stone-400 text-xs mt-6">
          Nur für autorisierte Administratoren
        </p>
      </div>
    </div>
  );
}
