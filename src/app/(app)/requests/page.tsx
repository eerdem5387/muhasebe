import { requireAuth, canManageOperations } from "@/lib/context";
import {
  completeExpenseRequestAction,
  createExpenseRequestAction,
  rejectRequestAction,
} from "@/app/actions/expenses";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, STATUS_TR, fmtMoney, todayISO } from "@/lib/format";

const color = {
  PENDING: "amber",
  APPROVED: "blue",
  COMPLETED: "green",
  REJECTED: "red",
} as const;

export default async function RequestsPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const requests = await ctx.db.expenseRequest.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Harcama talepleri"
        description="Talep tutarsız oluşturulur → kurucu okul panelinden onaylar → muhasebe harcama tutarını girip tamamlar."
        actions={
          canWrite ? (
            <FormModal buttonLabel="Talep oluştur" title="Yeni talep">
              <ActionForm action={createExpenseRequestAction} submitLabel="Talebi gönder">
                <div>
                  <label className="label" htmlFor="title">Harcama kalemi</label>
                  <input
                    id="title"
                    name="title"
                    className="input"
                    required
                    placeholder="Sosyal medya için mikrofon"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="requesterName">Talep eden</label>
                  <input
                    id="requesterName"
                    name="requesterName"
                    className="input"
                    defaultValue={ctx.name}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="channel">Harcama kanalı</label>
                  <select id="channel" name="channel" className="input" defaultValue="BANK">
                    <option value="BANK">Banka</option>
                    <option value="CHECK">Çek</option>
                    <option value="CREDIT_CARD">Kredi kartı</option>
                    <option value="CASH">Nakit</option>
                    <option value="PROMISSORY">Senet</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="notes">Açıklama</label>
                  <input id="notes" name="notes" className="input" placeholder="İsteğe bağlı açıklama" />
                </div>
              </ActionForm>
            </FormModal>
          ) : undefined
        }
      />
      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">{r.title}</h2>
                <p className="text-sm text-slate-500">
                  {r.requesterName} · {CHANNEL_TR[r.channel] ?? r.channel}
                </p>
                {r.notes ? <p className="mt-1 text-sm text-slate-600">{r.notes}</p> : null}
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {r.total != null ? fmtMoney(Number(r.total)) : "Tutar yok"}
                </p>
                <Badge color={color[r.status]}>{STATUS_TR[r.status] ?? r.status}</Badge>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Kurucu: {r.founderApprovedAt ? "onayladı" : "bekliyor"}</span>
              <span>Muhasebe: {r.completedAt ? "tamamladı" : r.status === "APPROVED" ? "tutar bekleniyor" : "—"}</span>
            </div>

            {r.status === "PENDING" && canWrite ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <MiniForm action={rejectRequestAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn-danger !py-1.5 text-xs">Reddet</button>
                </MiniForm>
              </div>
            ) : null}

            {r.status === "APPROVED" && canWrite ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Harcama tutarını gir ve tamamla
                </p>
                <ActionForm action={completeExpenseRequestAction} submitLabel="Tamamla">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`amount-${r.id}`}>Tutar</label>
                      <input id={`amount-${r.id}`} name="amount" className="input" required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`occurredAt-${r.id}`}>Harcama tarihi</label>
                      <input
                        id={`occurredAt-${r.id}`}
                        name="occurredAt"
                        type="date"
                        className="input"
                        defaultValue={todayISO()}
                        required
                      />
                    </div>
                  </div>
                </ActionForm>
              </div>
            ) : null}
          </div>
        ))}
        {requests.length === 0 && <p className="text-sm text-slate-500">Bekleyen talep yok.</p>}
      </div>
    </div>
  );
}
