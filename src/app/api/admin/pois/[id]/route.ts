import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authSupabase = createAuthServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("points_of_interest")
    .update({
      name: body.name,
      description: body.description || null,
      category: body.category,
      lat: body.lat,
      lng: body.lng,
      address: body.address || null,
      website: body.website || null,
      is_featured: body.is_featured || false,
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authSupabase = createAuthServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("points_of_interest")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
