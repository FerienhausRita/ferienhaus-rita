import { Metadata } from "next";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getAdminProfiles, getAllSiteSettings } from "../actions";
import { apartments } from "@/data/apartments";
import { icalFeeds } from "@/data/ical-feeds";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
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

  const [admins, siteSettings, dbApartments] = await Promise.all([
    getAdminProfiles(),
    getAllSiteSettings(),
    getAllApartmentsWithPricing(),
  ]);

  const feedData = Object.entries(icalFeeds).map(([aptId, urls]) => ({
    apartmentId: aptId,
    apartmentName:
      dbApartments.find((a) => a.id === aptId)?.name ?? aptId,
    urls,
  }));

  // Apartment name overrides for SettingsPanel
  const apartmentNames = apartments.map((staticApt) => {
    const dbApt = dbApartments.find((a) => a.id === staticApt.id);
    return {
      id: staticApt.id,
      defaultName: staticApt.name,
      currentName: dbApt?.name ?? staticApt.name,
    };
  });

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
        siteSettings={siteSettings}
        apartmentNames={apartmentNames}
      />
    </div>
  );
}
