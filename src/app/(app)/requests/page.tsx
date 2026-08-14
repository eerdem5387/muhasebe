import { requireAuth, canApproveAsFounder, canApproveAsPrincipal, canManageOperations } from "@/lib/context";
import { approveRequestAction, createExpenseRequestAction, rejectRequestAction } from "@/app/actions/expenses";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, STATUS_TR, fmtMoney } from "@/lib/format";

const color = { PENDING: "amber", APPROVED: "green", REJECTED: "red" } as const;

export default async function RequestsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const asPrincipal = canApproveAsPrincipal(ctx.role, ctx.isSuperAdmin);
  const asFounder = canApproveAsFounder(ctx.role, ctx.isSuperAdmin);
  const requests = await ctx.db.expenseRequest.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Harcama talepleri" description="Müdür ve kurucu onayı (sıra önemli değil) tamamlanmadan harcama yapılamaz." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {requests.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">{r.title}</h2>
                  <p className="text-sm text-slate-500">
                    {r.requesterName} · {Number(r.quantity)} × {fmtMoney(Number(r.unitPrice))} · {CHANNEL_TR[r.channel]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmtMoney(Number(r.total))}</p>
                  <Badge color={color[r.status]}>{STATUS_TR[r.status]}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Müdür: {r.principalApprovedAt ? "onayladı" : "bekliyor"}</span>
                <span>Kurucu: {r.founderApprovedAt ? "onayladı" : "bekliyor"}</span>
              </div>
              {r.status === "PENDING" && (asPrincipal || asFounder) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {asPrincipal && !r.principalApprovedAt && (
                    <MiniForm action={approveRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="as" value="principal" />
                      <button className="btn-primary !py-1.5 text-xs">Müdür onayı</button>
                    </MiniForm>
                  )}
                  {asFounder && !r.founderApprovedAt && (
                    <MiniForm action={approveRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="as" value="founder" />
                      <button className="btn-primary !py-1.5 text-xs">Kurucu onayı</button>
                    </MiniForm>
                  )}
                  <MiniForm action={rejectRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-danger !py-1.5 text-xs">Reddet</button>
                  </MiniForm>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-500">Bekleyen talep yok.</p>}
        </div>
        {canWrite && (
          <div className="card p-5 h-fit">
            <h2 className="mb-4 font-semibold text-slate-800">Yeni talep</h2>
            <ActionForm action={createExpenseRequestAction} submitLabel="Talebi gönder">
              <div>
                <label className="label" htmlFor="title">Harcama talebinin adı</label>
                <input id="title" name="title" className="input" required placeholder="Sosyal medya için mikrofon" />
              </div>
              <div>
                <label className="label" htmlFor="quantity">Miktar</label>
                <input id="quantity" name="quantity" className="input" defaultValue="1" required />
              </div>
              <div>
                <label className="label" htmlFor="unitPrice">Birim ücret</label>
                <input id="unitPrice" name="unitPrice" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="requesterName">Talep eden</label>
                <input id="requesterName" name="requesterName" className="input" defaultValue={ctx.name} required />
              </div>
              <div>
                <label className="label" htmlFor="channel">Harcama kanalı</label>
                <select id="channel" name="channel" className="input" defaultValue="TRANSFER">
                  <option value="CREDIT_CARD">Kredi kartı</option>
                  <option value="TRANSFER">Para transferi</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="notes">Not</label>
                <input id="notes" name="notes" className="input" />
              </div>
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  );
}
