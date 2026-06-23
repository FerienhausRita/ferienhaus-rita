import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BELEGE_BUCKET = "belege";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin-Auth
  const auth = createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await auth
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServerClient();
  const { data: expense } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", params.id)
    .single();
  const path = expense?.receipt_path as string | undefined;
  if (!path) return NextResponse.json({ error: "Kein Beleg" }, { status: 404 });

  const { data: file, error } = await supabase.storage.from(BELEGE_BUCKET).download(path);
  if (error || !file) return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (path.split(".").pop() || "").toLowerCase();
  const type =
    file.type ||
    (ext === "pdf"
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="beleg-${params.id}.${ext || "pdf"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
