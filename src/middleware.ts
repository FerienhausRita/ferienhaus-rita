import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ============================================
  // ADMIN ROUTES
  // ============================================
  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/api/admin");
  if (isAdminRoute) {
    if (!user) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  // ============================================
  // CLEANING ROUTES
  // ============================================
  // Login-Seite ist öffentlich erreichbar (sonst Redirect-Schleife)
  const isCleaningLogin = path === "/reinigung/login";

  // Eingeloggte, aktive Reinigungs-User (oder Admins) von der Login-Seite wegleiten
  if (isCleaningLogin && user) {
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (adminProfile) {
      return NextResponse.redirect(new URL("/reinigung", request.url));
    }
    const { data: cleaningProfile } = await supabase
      .from("cleaning_profiles")
      .select("id, active")
      .eq("id", user.id)
      .single();
    if (cleaningProfile && cleaningProfile.active) {
      return NextResponse.redirect(new URL("/reinigung", request.url));
    }
  }

  const isCleaningRoute =
    (path.startsWith("/reinigung") && !isCleaningLogin) ||
    path.startsWith("/api/cleaning");
  if (isCleaningRoute) {
    if (!user) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/reinigung/login", request.url));
    }

    // Admins haben immer Zugriff aufs Reinigungs-Portal — NICHT ausloggen.
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!adminProfile) {
      const { data: cleaningProfile } = await supabase
        .from("cleaning_profiles")
        .select("id, active")
        .eq("id", user.id)
        .single();

      if (!cleaningProfile || !cleaningProfile.active) {
        if (path.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await supabase.auth.signOut();
        const loginUrl = new URL("/reinigung/login", request.url);
        loginUrl.searchParams.set(
          "error",
          cleaningProfile && !cleaningProfile.active ? "disabled" : "unauthorized"
        );
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ============================================
  // LOGIN PAGE: Eingeloggte Nutzer wegleiten
  // ============================================
  if (path === "/auth/login" && user) {
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminProfile) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    const { data: cleaningProfile } = await supabase
      .from("cleaning_profiles")
      .select("id, active")
      .eq("id", user.id)
      .single();

    if (cleaningProfile && cleaningProfile.active) {
      return NextResponse.redirect(new URL("/reinigung", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/reinigung/:path*",
    "/api/cleaning/:path*",
    "/auth/login",
  ],
};
