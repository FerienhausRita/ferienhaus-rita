"use client";

import { useState } from "react";
import { markMessageRead } from "@/app/(admin)/admin/actions";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface SentEmail {
  id: string;
  booking_id: string | null;
  guest_email: string;
  subject: string;
  body: string;
  sent_by_name: string;
  sent_at: string;
}

interface NachrichtenTabsProps {
  messages: ContactMessage[];
  sentEmails: SentEmail[];
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NachrichtenTabs({
  messages,
  sentEmails,
}: NachrichtenTabsProps) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readMessages, setReadMessages] = useState<Set<string>>(
    new Set(messages.filter((m) => m.read_at).map((m) => m.id))
  );

  const unreadCount = messages.filter(
    (m) => !m.read_at && !readMessages.has(m.id)
  ).length;

  const handleExpand = async (msg: ContactMessage) => {
    const newId = expandedId === msg.id ? null : msg.id;
    setExpandedId(newId);

    // Mark as read if opening and unread
    if (newId && !msg.read_at && !readMessages.has(msg.id)) {
      setReadMessages((prev) => new Set(prev).add(msg.id));
      await markMessageRead(msg.id);
    }
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab("inbox")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            tab === "inbox"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Posteingang
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-[#c8a96e] text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            tab === "sent"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Gesendet ({sentEmails.length})
        </button>
      </div>

      {/* Inbox */}
      {tab === "inbox" && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <p className="text-stone-500">Keine Nachrichten vorhanden</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isRead = msg.read_at || readMessages.has(msg.id);
              const isExpanded = expandedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                    isRead ? "border-stone-200" : "border-[#c8a96e]/40"
                  }`}
                >
                  <button
                    onClick={() => handleExpand(msg)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                  >
                    {/* Unread dot */}
                    <div className="pt-1.5 shrink-0">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isRead ? "bg-transparent" : "bg-[#c8a96e]"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm truncate ${
                            isRead
                              ? "text-stone-700"
                              : "text-stone-900 font-semibold"
                          }`}
                        >
                          {msg.name}
                        </span>
                        <span className="text-xs text-stone-400 shrink-0">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 truncate mt-0.5">
                        {msg.subject || "Allgemeine Anfrage"} – {msg.message.slice(0, 80)}
                        {msg.message.length > 80 && "..."}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-stone-400 shrink-0 mt-1.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t border-stone-100">
                      <div className="pt-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-stone-500">E-Mail: </span>
                            <a
                              href={`mailto:${msg.email}`}
                              className="text-[#c8a96e] hover:text-[#b89555]"
                            >
                              {msg.email}
                            </a>
                          </div>
                          {msg.phone && (
                            <div>
                              <span className="text-stone-500">Telefon: </span>
                              <a
                                href={`tel:${msg.phone}`}
                                className="text-[#c8a96e] hover:text-[#b89555]"
                              >
                                {msg.phone}
                              </a>
                            </div>
                          )}
                        </div>
                        {msg.subject && (
                          <div className="text-sm">
                            <span className="text-stone-500">Betreff: </span>
                            <span className="text-stone-900">{msg.subject}</span>
                          </div>
                        )}
                        <div className="bg-stone-50 rounded-xl p-4">
                          <p className="text-sm text-stone-700 whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <a
                            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || "Ihre Anfrage")}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                              />
                            </svg>
                            Antworten
                          </a>
                          <a
                            href={`tel:${msg.phone}`}
                            className={`inline-flex items-center gap-2 px-4 py-2 border border-stone-200 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors ${
                              !msg.phone ? "hidden" : ""
                            }`}
                          >
                            Anrufen
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sent Emails */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sentEmails.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <p className="text-stone-500">Noch keine E-Mails gesendet</p>
            </div>
          ) : (
            sentEmails.map((email) => {
              const isExpanded = expandedId === email.id;
              return (
                <div
                  key={email.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : email.id)
                    }
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                  >
                    <div className="pt-1 shrink-0">
                      <svg
                        className="w-4 h-4 text-stone-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-stone-700 truncate">
                          An: {email.guest_email}
                        </span>
                        <span className="text-xs text-stone-400 shrink-0">
                          {formatDateTime(email.sent_at)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 truncate mt-0.5">
                        {email.subject}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Von: {email.sent_by_name}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-stone-400 shrink-0 mt-1.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t border-stone-100">
                      <div className="pt-4">
                        <div className="bg-stone-50 rounded-xl p-4">
                          <p className="text-sm text-stone-700 whitespace-pre-wrap">
                            {email.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
