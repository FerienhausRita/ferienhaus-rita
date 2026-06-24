import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/onedrive";

export const dynamic = "force-dynamic";

/** OAuth-Callback: Code → Refresh-Token, in site_settings speichern. */
export async function GET(request: NextRequest) {
  const auth = createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await auth.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const settingsUrl = new URL("/admin/einstellungen", url.origin);

  const error = url.searchParams.get("error");
  if (error) {
    settingsUrl.searchParams.set("onedrive", "error");
    return NextResponse.redirect(settingsUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("onedrive_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    settingsUrl.searchParams.set("onedrive", "state");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) throw new Error("Kein Refresh-Token erhalten (offline_access fehlt?)");

    const supabase = createServerClient();
    await supabase.from("site_settings").upsert({
      key: "onedrive_token",
      value: { refresh_token: tokens.refresh_token, connected_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
    // Standard-Ordner setzen, falls noch keiner konfiguriert ist.
    const { data: folderRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "onedrive_folder")
      .maybeSingle();
    if (!folderRow) {
      await supabase.from("site_settings").upsert({
        key: "onedrive_folder",
        value: "Belege",
        updated_at: new Date().toISOString(),
      });
    }

    settingsUrl.searchParams.set("onedrive", "connected");
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete("onedrive_oauth_state");
    return res;
  } catch (e) {
    console.error("OneDrive callback error:", e);
    settingsUrl.searchParams.set("onedrive", "error");
    return NextResponse.redirect(settingsUrl);
  }
}
