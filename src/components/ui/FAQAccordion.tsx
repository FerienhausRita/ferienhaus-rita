"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div
            key={index}
            className="bg-white rounded-xl border border-stone-200 overflow-hidden"
          >
            <button
              id={buttonId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition-colors"
            >
              <span className="text-sm font-medium text-stone-800 pr-4">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 text-stone-400 flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
            >
              {isOpen && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-stone-500 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
