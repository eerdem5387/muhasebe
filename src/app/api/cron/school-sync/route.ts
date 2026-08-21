import { NextResponse } from "next/server";
import { runSchoolSync } from "@/server/school-sync";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Production: cron must present CRON_SECRET. Dev may run without it.
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const result = await runSchoolSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
