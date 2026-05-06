import { Metadata } from "next";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import CleaningHeader from "@/components/cleaning/CleaningHeader";

export const metadata: Metadata = {
  title: {
    default: "Reinigung | Ferienhaus Rita",
    template: "%s | Reinigung – Ferienhaus Rita",
  },
  robots: "noindex, nofollow",
};

export default async function CleaningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("cleaning_profiles")
    .select("display_name, email")
    .eq("id", user?.id ?? "")
    .single();

  const userName =
    profile?.display_name || user?.email?.split("@")[0] || "Reinigung";
  const userEmail = profile?.email || user?.email || "";

  return (
    <div className="min-h-screen bg-stone-50">
      <CleaningHeader userName={userName} userEmail={userEmail} />
      <main className="pb-12">{children}</main>
    </div>
  );
}
