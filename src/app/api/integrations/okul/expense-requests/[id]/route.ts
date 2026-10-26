import { NextResponse } from "next/server";
import { authorizeIntegrationRequest } from "@/lib/integration-auth";
import {
  applyExpenseRequestApproval,
  applyExpenseRequestRejection,
  exportFinanceSnapshot,
  resolveDefaultTenantId,
} from "@/server/expense-request-approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!authorizeIntegrationRequest(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    tenantId?: string;
    action?: "approve" | "reject";
    as?: "principal" | "founder";
    actorId?: string;
    actorName?: string;
    reason?: string;
  };

  const tenantId = await resolveDefaultTenantId(body.tenantId);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant bulunamadı." }, { status: 400 });
  }

  const actorId = body.actorId?.trim() || "oys:unknown";
  const actorName = body.actorName?.trim() || null;
  const action = body.action === "reject" ? "reject" : "approve";

  if (action === "reject") {
    const result = await applyExpenseRequestRejection({
      tenantId,
      requestId: id,
      actorId,
      actorName,
      reason: body.reason,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, request: result.request });
  }

  const as = body.as === "principal" ? "principal" : "founder";
  const result = await applyExpenseRequestApproval({
    tenantId,
    requestId: id,
    as,
    actorId,
    actorName,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, request: result.request });
}
