import { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import ChatPanel from "@/components/admin/ChatPanel";

export const metadata: Metadata = {
  title: "Chat",
};

export const dynamic = "force-dynamic";

export default async function ChatAdminPage() {
  const supabase = createServerClient();
  const { data: conversations } = await supabase
    .from("chat_conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Chat</h1>
        <p className="text-sm text-stone-500 mt-1">
          Nachrichten von Gästen aus dem Buchungsportal.
        </p>
      </div>
      <ChatPanel initialConversations={conversations || []} />
    </div>
  );
}
