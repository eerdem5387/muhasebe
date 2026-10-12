import { NextResponse } from "next/server";
import { authorizeIntegrationRequest } from "@/lib/integration-auth";
import { exportFinanceSnapshot, resolveDefaultTenantId } from "@/server/expense-request-approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Okul tarafı full sync / reconcile. */
export async function GET(req: Request) {
  if (!authorizeIntegrationRequest(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }
  const url = new URL(req.url);
  const tenantId = await resolveDefaultTenantId(url.searchParams.get("tenantId"));
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant bulunamadı." }, { status: 400 });
  }
  const snapshot = await exportFinanceSnapshot(tenantId);
  return NextResponse.json(snapshot);
}
