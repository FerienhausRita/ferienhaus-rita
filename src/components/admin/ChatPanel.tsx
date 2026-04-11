"use client";

import { useState, useEffect, useRef } from "react";

interface Conversation {
  id: string;
  booking_id: string;
  guest_name: string;
  status: string;
  unread_admin: number;
  updated_at: string;
}

interface Message {
  id: string;
  sender_type: "guest" | "admin";
  content: string;
  created_at: string;
}

export default function ChatPanel({
  initialConversations,
}: {
  initialConversations: Conversation[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;

    async function fetchMessages() {
      const res = await fetch(`/api/chat/${selectedId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    }

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId]);

  // Poll conversations list
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/chat/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim(), senderType: "admin" }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
        // Reset unread
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, unread_admin: 0 } : c))
        );
      }
    } catch (err) {
      console.error("Send error:", err);
    }
    setSending(false);
  };

  const selectConversation = (id: string) => {
    setSelectedId(id);
    // Immediately clear unread badge locally
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_admin: 0 } : c))
    );
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Conversation list */}
      <div className="w-72 border-r border-stone-200 flex flex-col">
        <div className="p-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900 text-sm">Konversationen</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-stone-400">Keine Chats vorhanden.</p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`w-full text-left p-4 border-b border-stone-50 hover:bg-stone-50 transition-colors ${
                selectedId === conv.id ? "bg-stone-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {conv.guest_name}
                </p>
                {conv.unread_admin > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {conv.unread_admin}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {conv.booking_id.slice(0, 8).toUpperCase()}
                {" \u00b7 "}
                {conv.status === "open" ? "Offen" : "Geschlossen"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-900 text-sm">{selected.guest_name}</p>
                <p className="text-xs text-stone-400">
                  Buchung {selected.booking_id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.sender_type === "admin"
                        ? "bg-[#c8a96e] text-white rounded-br-md"
                        : "bg-white border border-stone-200 text-stone-800 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.sender_type === "admin" ? "text-white/60" : "text-stone-400"
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
            </div>

            {/* Input */}
            <div className="p-3 border-t border-stone-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Antwort schreiben..."
                  className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#c8a96e]/30 focus:border-[#c8a96e]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="px-4 py-2.5 bg-[#c8a96e] text-white rounded-xl text-sm font-medium hover:bg-[#b8994e] disabled:opacity-50 transition-colors"
                >
                  Senden
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
            Konversation auswählen
          </div>
        )}
      </div>
    </div>
  );
}
