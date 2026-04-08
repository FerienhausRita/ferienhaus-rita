import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { markMessageRead } from "../../actions";

export const metadata: Metadata = {
  title: "Nachricht",
};

export const dynamic = "force-dynamic";

export default async function NachrichtDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();
  const { data: msg, error } = await supabase
    .from("contact_messages")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !msg) {
    notFound();
  }

  // Mark as read
  if (!msg.read_at) {
    await markMessageRead(msg.id);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/admin/nachrichten"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Zurück zu Nachrichten
      </Link>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h1 className="text-lg font-semibold text-stone-900">
            {msg.subject || "Allgemeine Anfrage"}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Von {msg.name} &middot;{" "}
            {new Date(msg.created_at).toLocaleDateString("de-AT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">E-Mail</p>
              <a href={`mailto:${msg.email}`} className="text-sm text-[#c8a96e] hover:text-[#b89555]">
                {msg.email}
              </a>
            </div>
            {msg.phone && (
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Telefon</p>
                <a href={`tel:${msg.phone}`} className="text-sm text-[#c8a96e] hover:text-[#b89555]">
                  {msg.phone}
                </a>
              </div>
            )}
          </div>

          <div className="bg-stone-50 rounded-xl p-4">
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {msg.message}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <a
              href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || "Ihre Anfrage")}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Antworten
            </a>
            {msg.phone && (
              <a
                href={`tel:${msg.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-200 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors"
              >
                Anrufen
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
