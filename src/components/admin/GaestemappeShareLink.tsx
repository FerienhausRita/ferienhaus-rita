"use client";

import { useState } from "react";

export default function GaestemappeShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — Safari restricted contexts
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <svg
          className="w-5 h-5 text-blue-600 mt-0.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">
            Öffentlicher Link zur Gästemappe
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            Diesen Link kannst du an Gäste senden — kein Login notwendig.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg text-stone-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="button"
          onClick={copy}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {copied ? "✓ Kopiert" : "Kopieren"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Ansehen
        </a>
      </div>
    </div>
  );
}
