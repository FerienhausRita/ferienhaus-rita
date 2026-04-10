import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authSupabase = createAuthServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
