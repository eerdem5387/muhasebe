import { requireAuth, canManageOperations } from "@/lib/context";
import {
  completeExpenseRequestAction,
  createExpenseRequestAction,
  deleteExpenseRequestAction,
  rejectRequestAction,
} from "@/app/actions/expenses";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, STATUS_TR, fmtDate, fmtMoney, todayISO } from "@/lib/format";
import { RequestDateFilter } from "./date-filter";

const color = {
  PENDING: "amber",
  APPROVED: "blue",
  COMPLETED: "green",
  REJECTED: "red",
} as const;

function parseDay(raw: string | undefined): string | null {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const date = parseDay((await searchParams).date);
  const today = todayISO();

  const where = date
    ? {
        createdAt: {
          gte: new Date(`${date}T00:00:00+03:00`),
          lt: new Date(`${shiftIsoDay(date, 1)}T00:00:00+03:00`),
        },
      }
    : undefined;

  const requests = await ctx.db.expenseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

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

      <RequestDateFilter date={date} today={today} />

      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-slate-800">{r.title}</h2>
                  <Badge color={color[r.status]}>{STATUS_TR[r.status] ?? r.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fmtDate(r.createdAt)} · {r.requesterName} · {CHANNEL_TR[r.channel] ?? r.channel}
                  {r.notes ? ` · ${r.notes}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Kurucu: {r.founderApprovedAt ? "onayladı" : "bekliyor"}
                  {" · "}
                  Muhasebe:{" "}
                  {r.completedAt
                    ? "tamamladı"
                    : r.status === "APPROVED"
                      ? "tutar bekleniyor"
                      : "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {r.total != null ? fmtMoney(Number(r.total)) : "—"}
                </p>
                {canWrite ? (
                  <MiniForm action={deleteExpenseRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                      onClick={(e) => {
                        if (!confirm("Bu talebi silmek istediğinize emin misiniz?")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      Sil
                    </button>
                  </MiniForm>
                ) : null}
              </div>
            </div>

            {r.status === "PENDING" && canWrite ? (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                <MiniForm action={rejectRequestAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn-danger !py-1 text-xs">Reddet</button>
                </MiniForm>
              </div>
            ) : null}

            {r.status === "APPROVED" && canWrite ? (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <ActionForm action={completeExpenseRequestAction} submitLabel="Tamamla">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div>
                      <label className="label !mb-1" htmlFor={`amount-${r.id}`}>Tutar</label>
                      <input id={`amount-${r.id}`} name="amount" className="input !py-1.5 text-sm" required />
                    </div>
                    <div>
                      <label className="label !mb-1" htmlFor={`occurredAt-${r.id}`}>Harcama tarihi</label>
                      <input
                        id={`occurredAt-${r.id}`}
                        name="occurredAt"
                        type="date"
                        className="input !py-1.5 text-sm"
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
        {requests.length === 0 && (
          <p className="text-sm text-slate-500">
            {date ? "Bu günde talep yok." : "Bekleyen talep yok."}
          </p>
        )}
      </div>
    </div>
  );
}

function shiftIsoDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + delta);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}
