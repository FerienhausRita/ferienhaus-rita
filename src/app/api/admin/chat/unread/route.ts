import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authSupabase = createAuthServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("unread_admin")
    .eq("status", "open");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = (data || []).reduce(
    (sum, c) => sum + ((c.unread_admin as number) || 0),
    0
  );

  return NextResponse.json({ count });
}
