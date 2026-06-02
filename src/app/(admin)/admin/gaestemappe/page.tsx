import { Metadata } from "next";
import { getAllSiteSettings } from "../actions";
import GuestGuideEditor from "@/components/admin/GuestGuideEditor";
import GaestemappeShareLink from "@/components/admin/GaestemappeShareLink";

export const metadata: Metadata = {
  title: "Gästemappe",
};

export const dynamic = "force-dynamic";

export default async function GaestemappeAdminPage() {
  const settings = await getAllSiteSettings();
  const guideData = (settings.guest_guide as any[]) || [];

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.ferienhaus-rita-kals.at";
  const publicUrl = `${siteUrl.replace(/\/$/, "")}/gaestemappe`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Gästemappe</h1>
        <p className="text-sm text-stone-500 mt-1">
          Inhalte verwalten, die Gäste im Portal sehen (WLAN, Hausregeln, Tipps, etc.)
        </p>
      </div>
      <GaestemappeShareLink url={publicUrl} />
      <GuestGuideEditor initialData={guideData} />
    </div>
  );
}
