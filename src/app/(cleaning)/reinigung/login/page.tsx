"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabase/auth-client";
import { cleaningUsernameToEmail } from "@/lib/cleaning-auth";

export default function CleaningLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const urlError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error")
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleaningUsernameToEmail(username),
        password,
      });

      if (error) {
        setStatus("error");
        setErrorMessage("Benutzername oder Passwort ist falsch.");
        return;
      }

      router.replace("/reinigung");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#c8a96e] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif text-2xl font-bold">FR</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Reinigungs-Portal
          </h1>
          <p className="text-stone-500 text-sm mt-1">Ferienhaus Rita</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8"
        >
          <h2 className="font-semibold text-stone-900 text-lg mb-1">Anmelden</h2>
          <p className="text-stone-500 text-sm mb-6">
            Mit Benutzername und Passwort anmelden.
          </p>

          {urlError === "disabled" && status === "idle" && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              Ihr Zugang wurde von der Verwaltung deaktiviert.
            </div>
          )}
          {urlError === "unauthorized" && status === "idle" && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              Kein gültiger Zugang. Bitte erneut anmelden.
            </div>
          )}

          <label
            htmlFor="username"
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            Benutzername
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="z. B. maria"
            required
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50 transition-colors"
          />

          <label
            htmlFor="password"
            className="block text-sm font-medium text-stone-700 mb-1.5 mt-4"
          >
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
            disabled={status === "loading" || !username.trim() || !password}
            className="w-full mt-5 py-3 px-4 bg-[#c8a96e] hover:bg-[#b89555] disabled:bg-stone-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Anmelden…
              </>
            ) : (
              "Anmelden"
            )}
          </button>
        </form>

        <p className="text-center text-stone-400 text-xs mt-6">
          Zugang erhalten Sie von der Verwaltung.
        </p>
      </div>
    </div>
  );
}
