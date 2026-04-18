import { Metadata } from "next";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import RouterRefresh from "@/components/admin/RouterRefresh";
import IdleLock from "@/components/admin/IdleLock";

export const metadata: Metadata = {
  title: {
    default: "Admin | Ferienhaus Rita",
    template: "%s | Admin – Ferienhaus Rita",
  },
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get admin profile
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("display_name, email, role")
    .eq("id", user?.id ?? "")
    .single();

  const userName = profile?.display_name || user?.email?.split("@")[0] || "Admin";
  const userEmail = profile?.email || user?.email || "";

  return (
    <div className="min-h-screen bg-stone-50">
      <RouterRefresh />
      <IdleLock />
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <div className="no-print">
        <AdminBottomNav />
      </div>

      {/* Main content area */}
      <div className="md:ml-64 pb-20 md:pb-0 print:ml-0 print:pb-0">
        {children}
      </div>
    </div>
  );
}
