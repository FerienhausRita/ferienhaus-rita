"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    privacy: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.message || "Ein Fehler ist aufgetreten.");
        return;
      }

      setIsSubmitted(true);
    } catch {
      setSubmitError(
        "Verbindungsfehler. Bitte versuchen Sie es erneut."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-stone-900 mb-2">
          Nachricht gesendet!
        </h3>
        <p className="text-stone-500">
          Vielen Dank für Ihre Nachricht. Wir melden uns schnellstmöglich bei
          Ihnen.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 focus:border-[var(--color-gold)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            E-Mail *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 focus:border-[var(--color-gold)]"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Betreff
        </label>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 focus:border-[var(--color-gold)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Nachricht *
        </label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          rows={5}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 focus:border-[var(--color-gold)] resize-none"
        />
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.privacy}
          onChange={(e) => setForm({ ...form, privacy: e.target.checked })}
          required
          className="mt-1 w-4 h-4 rounded border-stone-300 text-alpine-600 focus:ring-alpine-500"
        />
        <span className="text-sm text-stone-500">
          Ich habe die{" "}
          <a
            href="/datenschutz"
            target="_blank"
            className="text-alpine-600 underline"
          >
            Datenschutzerklärung
          </a>{" "}
          gelesen und stimme der Verarbeitung meiner Daten zu. *
        </span>
      </label>

      {submitError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-alpine-600 hover:bg-alpine-700 disabled:bg-stone-300 text-white py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg"
      >
        {isSubmitting ? "Wird gesendet..." : "Nachricht senden"}
      </button>
    </form>
  );
}
