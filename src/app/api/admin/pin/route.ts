import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

async function getCurrentAdminId(): Promise<string | null> {
  const supabase = createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const adminId = await getCurrentAdminId();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("pin_hash")
    .eq("id", adminId)
    .single();

  return NextResponse.json({ pinHash: data?.pin_hash ?? null });
}

export async function POST(request: NextRequest) {
  const adminId = await getCurrentAdminId();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, pin } = body;

  if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6) {
    return NextResponse.json({ success: false, error: "Ungültiger PIN" });
  }

  const supabase = createServerClient();

  if (action === "set") {
    const hashed = hashPin(pin);
    const { error } = await supabase
      .from("admin_profiles")
      .update({ pin_hash: hashed })
      .eq("id", adminId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "verify") {
    const { data } = await supabase
      .from("admin_profiles")
      .select("pin_hash")
      .eq("id", adminId)
      .single();

    if (!data?.pin_hash) {
      return NextResponse.json({ success: true }); // No PIN set = always valid
    }

    const valid = data.pin_hash === hashPin(pin);
    return NextResponse.json({ success: valid });
  }

  return NextResponse.json({ success: false, error: "Unknown action" });
}
