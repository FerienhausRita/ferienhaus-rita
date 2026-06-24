import { NextRequest, NextResponse } from "next/server";
import { runOneDriveImport } from "@/lib/onedrive-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifyAuth(request: NextRequest): boolean {
  if (request.headers.get("x-vercel-cron")) return true;
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (!process.env.CRON_SECRET && process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runOneDriveImport();
  const status = result.ok || result.reason ? 200 : 500;
  return NextResponse.json(result, { status });
}
