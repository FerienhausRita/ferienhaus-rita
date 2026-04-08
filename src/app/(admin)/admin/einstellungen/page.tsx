import { Metadata } from "next";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getAdminProfiles } from "../actions";
import { apartments } from "@/data/apartments";
import { icalFeeds } from "@/data/ical-feeds";
import SettingsPanel from "@/components/admin/SettingsPanel";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export const dynamic = "force-dynamic";

export default async function EinstellungenPage() {
  const supabase = createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("display_name, role")
    .eq("id", user?.id ?? "")
    .single();

  const admins = await getAdminProfiles();

  const feedData = Object.entries(icalFeeds).map(([aptId, urls]) => ({
    apartmentId: aptId,
    apartmentName:
      apartments.find((a) => a.id === aptId)?.name ?? aptId,
    urls,
  }));

  const exportBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.ferienhaus-rita-kals.at";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Einstellungen</h1>
      <SettingsPanel
        currentUserId={user?.id ?? ""}
        currentName={profile?.display_name || ""}
        currentRole={profile?.role || "admin"}
        admins={admins}
        icalFeeds={feedData}
        exportBaseUrl={exportBaseUrl}
      />
    </div>
  );
}
