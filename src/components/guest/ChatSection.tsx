"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  sender_type: "guest" | "admin";
  content: string;
  created_at: string;
}

interface ChatSectionProps {
  bookingId: string;
}

export default function ChatSection({ bookingId }: ChatSectionProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize conversation
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/chat?bookingId=${bookingId}`);
        if (res.ok) {
          const conv = await res.json();
          setConversationId(conv.id);
        }
      } catch (err) {
        console.error("Chat init error:", err);
      }
      setLoading(false);
    }
    init();
  }, [bookingId]);

  // Poll for messages when open
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/chat/${conversationId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Fetch messages error:", err);
      }
    }

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 10000); // Poll every 10s

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim(), senderType: "guest" }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } catch (err) {
      console.error("Send message error:", err);
    }
    setSending(false);
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header – toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-5 hover:bg-stone-50 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-alpine-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-alpine-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-stone-900">Nachricht an uns</p>
          <p className="text-sm text-stone-500">Fragen zum Aufenthalt? Schreiben Sie uns direkt.</p>
        </div>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Chat area */}
      {isOpen && (
        <div className="border-t border-stone-100">
          {/* Messages */}
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-stone-50">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-stone-400">
                  Noch keine Nachrichten. Schreiben Sie uns!
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "guest" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.sender_type === "guest"
                      ? "bg-alpine-600 text-white rounded-br-md"
                      : "bg-white border border-stone-200 text-stone-800 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.sender_type === "guest" ? "text-white/60" : "text-stone-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-stone-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ihre Nachricht..."
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-alpine-500/30 focus:border-alpine-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="px-4 py-2.5 bg-alpine-600 text-white rounded-xl text-sm font-medium hover:bg-alpine-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
