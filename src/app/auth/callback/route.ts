import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") || searchParams.get("redirect") || "/admin";

  const redirectTo = new URL(next, origin);

  const response = NextResponse.redirect(redirectTo);

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

  // PKCE flow: exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error("Code exchange failed:", error.message);
  }

  // Token hash flow (magic link without PKCE)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "magiclink" | "email",
    });
    if (!error) {
      return response;
    }
    console.error("Token verification failed:", error.message);
  }

  // If nothing worked, redirect to login with error
  return NextResponse.redirect(
    new URL("/auth/login?error=auth_failed", origin)
  );
}
