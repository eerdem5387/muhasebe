import { NextResponse } from "next/server"
import { authorizeIntegrationRequest } from "@/lib/integration-auth"
import { resolveDefaultTenantId } from "@/server/expense-request-approval"
import { exportFinanceSummary } from "@/server/finance-summary"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Kurucu paneli için anlık KPI özeti (tahsilat + kasa + talepler). */
export async function GET(req: Request) {
  if (!authorizeIntegrationRequest(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  }
  const url = new URL(req.url)
  const tenantId = await resolveDefaultTenantId(url.searchParams.get("tenantId"))
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant bulunamadı." }, { status: 400 })
  }
  const month = url.searchParams.get("month")
  const academicYear = url.searchParams.get("academicYear")
  const summary = await exportFinanceSummary(tenantId, month ?? undefined, academicYear)
  return NextResponse.json(summary)
}
