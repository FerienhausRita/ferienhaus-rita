import { Metadata } from "next";
import { getContactMessages, getSentEmails } from "../actions";
import NachrichtenTabs from "@/components/admin/NachrichtenTabs";

export const metadata: Metadata = {
  title: "Nachrichten",
};

export const dynamic = "force-dynamic";

export default async function NachrichtenPage() {
  const [messages, sentEmails] = await Promise.all([
    getContactMessages(),
    getSentEmails(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Nachrichten</h1>
      <NachrichtenTabs messages={messages} sentEmails={sentEmails} />
    </div>
  );
}
