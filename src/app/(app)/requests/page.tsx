import { requireAuth, canManageOperations } from "@/lib/context";
import { approvalProgress } from "@/lib/expense-approval-rule";
import {
  completeExpenseRequestAction,
  createExpenseRequestAction,
  rejectRequestAction,
} from "@/app/actions/expenses";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, STATUS_TR, fmtDate, fmtMoney, todayISO } from "@/lib/format";
import { RequestDateFilter } from "./date-filter";
import { DeleteRequestButton } from "./delete-button";
import { MoneyInput } from "@/components/money-input";
import { RequestAmountFields } from "./request-amount-fields";
import { RequestChannelFields } from "./request-channel-fields";

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

  const [requests, bankAccounts, expenseCards] = await Promise.all([
    ctx.db.expenseRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    ctx.db.bankAccountSetting.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    ctx.db.expenseCardSetting.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Harcama talepleri"
        description="Talep oluşturulur → okul panelinden onaylanır (5.000 ₺ üzeri: kurucu + müdür, altı: biri yeterli) → muhasebe tutarı girip (veya önceden girilmiş tutarı doğrulayıp) tamamlar."
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
                <RequestChannelFields
                  bankAccounts={bankAccounts}
                  expenseCards={expenseCards}
                />
                <RequestAmountFields />
                <div>
                  <label className="label" htmlFor="notes">Açıklama</label>
                  <input
                    id="notes"
                    name="notes"
                    className="input"
                    placeholder="Harcama açıklaması"
                    required
                    minLength={2}
                  />
                </div>
              </ActionForm>
            </FormModal>
          ) : undefined
        }
      />

      <RequestDateFilter date={date} today={today} />

      {(() => {
        const partialCount = requests.filter((r) => approvalProgress(r).partial).length;
        if (partialCount === 0) return null;
        return (
          <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
            {partialCount} talep tek onay aldı, ikinci onayı (kurucu veya müdür) bekliyor.
          </div>
        );
      })()}

      <div className="space-y-2.5">
        {requests.map((r) => (
          <div key={r.id} className="card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-ink-900">{r.title}</h2>
                  <Badge color={color[r.status]}>{STATUS_TR[r.status] ?? r.status}</Badge>
                  {(() => {
                    const progress = approvalProgress(r);
                    if (!progress.partial) return null;
                    return (
                      <Badge color="purple">
                        1/2 onay · {progress.waitingFor === "principal" ? "müdür" : "kurucu"} onayı bekleniyor
                      </Badge>
                    );
                  })()}
                </div>
                <p className="mt-0.5 text-xs text-ink-500">
                  {fmtDate(r.createdAt)} · {r.requesterName} · {CHANNEL_TR[r.channel] ?? r.channel}
                  {r.bankName ? ` · ${r.bankName}` : ""}
                  {r.notes ? ` · ${r.notes}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-ink-400">
                    {approvalProgress(r).rule === "dual"
                      ? "Çift onay (5.000 ₺ üzeri):"
                      : "Tek onay yeterli:"}
                  </span>
                  <ApprovalChip
                    label="Kurucu"
                    at={r.founderApprovedAt}
                    name={r.founderApprovedByName}
                    mutedText={r.status === "REJECTED" ? "—" : r.status !== "PENDING" ? "gerekmedi" : null}
                  />
                  <ApprovalChip
                    label="Müdür"
                    at={r.principalApprovedAt}
                    name={r.principalApprovedByName}
                    mutedText={r.status === "REJECTED" ? "—" : r.status !== "PENDING" ? "gerekmedi" : null}
                  />
                  <span className="text-ink-400">
                    · Muhasebe:{" "}
                    {r.completedAt
                      ? "tamamladı"
                      : r.status === "APPROVED"
                        ? "tutar bekleniyor"
                        : "—"}
                    {r.status === "REJECTED" && r.rejectedByName ? ` · Red: ${r.rejectedByName}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-semibold tabular-nums text-ink-900">
                  {r.total != null ? fmtMoney(Number(r.total)) : "—"}
                </p>
                {canWrite ? <DeleteRequestButton id={r.id} /> : null}
              </div>
            </div>

            {r.status === "PENDING" && canWrite ? (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-ink-100 pt-2">
                <MiniForm action={rejectRequestAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn-danger !py-1 text-xs">Reddet</button>
                </MiniForm>
              </div>
            ) : null}

            {r.status === "APPROVED" && canWrite ? (
              <div className="mt-2 border-t border-ink-100 pt-2">
                <ActionForm action={completeExpenseRequestAction} submitLabel="Tamamla">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <MoneyInput
                      id={`amount-${r.id}`}
                      name="amount"
                      label="Tutar"
                      defaultValue={r.total != null ? Number(r.total) : undefined}
                      required
                      inputClassName="!py-1.5 text-sm"
                    />
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
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white/70 px-6 py-10 text-center text-sm text-ink-500">
            {date ? "Bu günde talep yok." : "Bekleyen talep yok."}
          </div>
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

function ApprovalChip({
  label,
  at,
  name,
  mutedText,
}: {
  label: string;
  at: Date | null;
  name: string | null;
  /** Onay artık beklenmiyorsa (talep sonuçlandı) gösterilecek metin */
  mutedText?: string | null;
}) {
  if (at) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
        ✓ {label}: {name || "onayladı"}
      </span>
    );
  }
  return (
    <span
      className={
        mutedText
          ? "rounded-full bg-ink-50 px-2 py-0.5 text-ink-400"
          : "rounded-full bg-amber-50 px-2 py-0.5 text-amber-800"
      }
    >
      ○ {label}: {mutedText ?? "bekliyor"}
    </span>
  );
}
