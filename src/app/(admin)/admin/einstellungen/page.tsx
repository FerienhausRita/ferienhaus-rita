import { Metadata } from "next";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getAdminProfiles, getAllSiteSettings, getIcalImportFeeds } from "../actions";
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

  const [admins, siteSettings, dbApartments, icalImportRows] = await Promise.all([
    getAdminProfiles(),
    getAllSiteSettings(),
    getAllApartmentsWithPricing(),
    getIcalImportFeeds(),
  ]);

  // Legacy static feed mapping – still used for the "Export-Feeds" block in the
  // iCal section (those URLs are code-generated, apartment-id based).
  const feedData = Object.entries(icalFeeds).map(([aptId, urls]) => ({
    apartmentId: aptId,
    apartmentName:
      dbApartments.find((a) => a.id === aptId)?.name ?? aptId,
    urls,
  }));

  // Editable import feeds (DB-backed)
  const icalImportFeeds = icalImportRows.map((r) => ({
    id: r.id,
    apartment_id: r.apartment_id,
    apartment_name:
      dbApartments.find((a) => a.id === r.apartment_id)?.name ?? r.apartment_id,
    url: r.url,
    label: r.label ?? null,
    active: r.active,
    last_synced_at: r.last_synced_at ?? null,
    last_sync_status: r.last_sync_status ?? null,
    last_sync_error: r.last_sync_error ?? null,
    last_sync_event_count: r.last_sync_event_count ?? null,
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
        icalImportFeeds={icalImportFeeds}
        exportBaseUrl={exportBaseUrl}
        siteSettings={siteSettings}
        apartmentNames={apartmentNames}
      />
    </div>
  );
}
