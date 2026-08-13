import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "muhasebe-saas", ts: new Date().toISOString() });
}
