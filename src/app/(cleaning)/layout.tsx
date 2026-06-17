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

  const { data: profile } = user
    ? await supabase
        .from("cleaning_profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .single()
    : { data: null };

  const userName =
    profile?.display_name || profile?.username || "Reinigung";

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header nur für eingeloggte Reinigungs-User (nicht auf der Login-Seite) */}
      {profile && <CleaningHeader userName={userName} userEmail={profile.username ?? ""} />}
      <main className="pb-12">{children}</main>
    </div>
  );
}
