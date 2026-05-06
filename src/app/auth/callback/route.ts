import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const explicitNext = searchParams.get("next") || searchParams.get("redirect");

  // Initialer Response (wird ggf. überschrieben sobald Rolle bekannt)
  let response = NextResponse.redirect(new URL(explicitNext || "/admin", origin));

  const supabase = createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let authOk = false;

  // PKCE flow: exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) authOk = true;
    else console.error("Code exchange failed:", error.message);
  } else if (token_hash && type) {
    // Token hash flow (magic link without PKCE)
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "magiclink" | "email",
    });
    if (!error) authOk = true;
    else console.error("Token verification failed:", error.message);
  }

  if (!authOk) {
    return NextResponse.redirect(new URL("/auth/login?error=auth_failed", origin));
  }

  // Rollen-basiertes Routing: Admin geht nach /admin, Cleaning nach /reinigung
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let target = explicitNext;

  if (!target && user) {
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminProfile) {
      target = "/admin";
    } else {
      const { data: cleaningProfile } = await supabase
        .from("cleaning_profiles")
        .select("id, active")
        .eq("id", user.id)
        .single();

      if (cleaningProfile && cleaningProfile.active) {
        target = "/reinigung";
      } else if (cleaningProfile && !cleaningProfile.active) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/auth/login?error=disabled", origin));
      } else {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/auth/login?error=unauthorized", origin));
      }
    }
  }

  // Final redirect mit korrektem Target — Cookies aus dem ursprünglichen Response übernehmen
  const finalResponse = NextResponse.redirect(new URL(target || "/admin", origin));
  response.cookies.getAll().forEach((c) => {
    finalResponse.cookies.set(c.name, c.value);
  });
  response = finalResponse;
  return response;
}
