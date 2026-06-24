import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { buildAuthorizeUrl, isOneDriveConfigured } from "@/lib/onedrive";

export const dynamic = "force-dynamic";

/** Startet den OneDrive-OAuth-Flow (Admin-only). */
export async function GET(_request: NextRequest) {
  const auth = createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await auth.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isOneDriveConfigured()) {
    return NextResponse.json(
      { error: "OneDrive ist nicht konfiguriert (Azure-Env-Variablen fehlen)." },
      { status: 503 }
    );
  }

  const state = randomUUID();
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  // State-Cookie zur CSRF-Absicherung des Callbacks.
  res.cookies.set("onedrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
