"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-stone-600 leading-relaxed">
            Diese Website verwendet ausschließlich technisch notwendige Cookies,
            die für den Betrieb der Seite erforderlich sind. Es werden keine
            Tracking- oder Marketing-Cookies eingesetzt.{" "}
            <a
              href="/datenschutz"
              className="text-alpine-600 underline hover:text-alpine-700"
            >
              Mehr erfahren
            </a>
          </p>
        </div>
        <button
          onClick={accept}
          className="flex-shrink-0 bg-alpine-600 hover:bg-alpine-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
