import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Auth check
  const authSupabase = createAuthServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("points_of_interest")
    .insert({
      name: body.name,
      description: body.description || null,
      category: body.category,
      lat: body.lat,
      lng: body.lng,
      address: body.address || null,
      website: body.website || null,
      is_featured: body.is_featured || false,
      active: body.active !== false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
