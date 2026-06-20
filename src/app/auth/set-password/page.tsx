"use client";

import { useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-client";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMessage("Die Passwörter stimmen nicht überein.");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus("error");
        setErrorMessage(
          error.message.includes("session")
            ? "Sitzung abgelaufen. Bitte den Link aus der E-Mail erneut öffnen."
            : error.message
        );
        return;
      }
      window.location.assign("/admin");
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
          <h1 className="font-serif text-2xl font-bold text-stone-900">Passwort festlegen</h1>
          <p className="text-stone-500 text-sm mt-1">Ferienhaus Rita – Admin</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8"
        >
          <label htmlFor="pw" className="block text-sm font-medium text-stone-700 mb-1.5">
            Neues Passwort
          </label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mindestens 8 Zeichen"
            required
            autoFocus
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50 transition-colors"
          />

          <label htmlFor="pw2" className="block text-sm font-medium text-stone-700 mb-1.5 mt-4">
            Passwort wiederholen
          </label>
          <input
            id="pw2"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50 transition-colors"
          />

          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !password || !confirm}
            className="w-full mt-5 py-3 px-4 bg-[#c8a96e] hover:bg-[#b89555] disabled:bg-stone-300 text-white font-medium rounded-xl transition-colors"
          >
            {status === "loading" ? "Speichern…" : "Passwort speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
