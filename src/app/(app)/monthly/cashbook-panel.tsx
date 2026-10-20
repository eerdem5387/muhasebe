"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { deleteCashbookEntryAction } from "@/app/actions/cashbook";
import { CASHBOOK_CHANNEL_TR, INCOME_CATEGORY_TR } from "@/lib/cashbook";
import { CHANNEL_TR, fmtDate, fmtMoney } from "@/lib/format";
import type { MonthlyLedgerRow } from "@/server/monthly-ledger";

export type CashbookRow = MonthlyLedgerRow;

/** Eski kayıtlardaki CREDIT_CARD vb. ham kodları Türkçe etikete çevir. */
function humanizeNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  let out = notes;
  const map: Record<string, string> = {
    ...CHANNEL_TR,
    ...CASHBOOK_CHANNEL_TR,
  };
  // "Kanal: CREDIT_CARD" → kaldır (kanal zaten ayrı alanda)
  out = out.replace(/\s*[·•|]\s*Kanal:\s*[A-Z0-9_]+/gi, "");
  out = out.replace(/\bKanal:\s*([A-Z0-9_]+)\b/gi, (_, code: string) => {
    const label = map[code] ?? code;
    return `Kanal: ${label}`;
  });
  for (const [code, label] of Object.entries(map)) {
    out = out.replace(new RegExp(`\\b${code}\\b`, "g"), label);
  }
  out = out.replace(/\s*[·•]\s*[·•]\s*/g, " · ").replace(/^\s*[·•]\s*|\s*[·•]\s*$/g, "").trim();
  return out || null;
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function TagBadge({ tag }: { tag: MonthlyLedgerRow["tag"] }) {
  if (tag === "PLANNED") return <Badge color="amber">Planlanmış</Badge>;
  if (tag === "CREDITED") return <Badge color="green">Hesaba geçti</Badge>;
  return null;
}

export function CashbookPanel({
  side,
  month,
  rows,
  canWrite,
  bookedTotal,
  plannedTotal = 0,
}: {
  side: "INCOME" | "EXPENSE";
  month: string;
  rows: CashbookRow[];
  canWrite: boolean;
  bookedTotal: number;
  plannedTotal?: number;
}) {
  const [selected, setSelected] = useState<CashbookRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const isIncome = side === "INCOME";

  const channelDisplay = selected
    ? selected.channel === "BANK" && isIncome
      ? "EFT / Havale"
      : selected.channel
        ? CASHBOOK_CHANNEL_TR[selected.channel] ?? selected.channelLabel
        : selected.channelLabel
    : "";

  async function handleDelete() {
    if (!selected?.deletable || deleting) return;
    if (!window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    setDeleting(true);
    try {
      const fd = new FormData();
      fd.set("id", selected.id);
      fd.set("yearMonth", month);
      await deleteCashbookEntryAction(fd);
      setSelected(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function parseNoteField(notes: string | null | undefined, label: string): string | null {
    if (!notes) return null;
    const re = new RegExp(`${label}:\\s*([^·]+)`, "i");
    const m = notes.match(re);
    return m?.[1]?.trim() || null;
  }

  function leftoverNotes(notes: string | null | undefined): string | null {
    const cleaned = humanizeNotes(notes);
    if (!cleaned) return null;
    const without = cleaned
      .replace(/Talep eden:\s*[^·]+/gi, "")
      .replace(/\s*[·]\s*[·]\s*/g, " · ")
      .replace(/^\s*[·]\s*|\s*[·]\s*$/g, "")
      .trim();
    return without || null;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-100">
            <tr className="border-b-2 border-slate-400">
              <th className="th text-slate-700">Açıklama</th>
              <th className="th text-slate-700">Kanal</th>
              <th className="th text-right text-slate-700">Tutar</th>
              <th className="th text-slate-700">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-b border-slate-300 hover:bg-brand-50/60 ${
                  row.tag === "PLANNED" ? "bg-amber-50/40" : "bg-white"
                }`}
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {row.title}
                    <TagBadge tag={row.tag} />
                  </span>
                </td>
                <td className="td text-slate-600">{row.channelLabel}</td>
                <td className="td text-right font-medium">{fmtMoney(row.amount)}</td>
                <td className="td text-slate-500">{fmtDate(row.occurredAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={4}>
                  {isIncome ? "Bu ay gelir yok." : "Bu ay gider yok."}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-[3px] border-slate-800 bg-slate-100 font-semibold">
              <td className="td" colSpan={2}>
                {isIncome ? "Toplam gelir (hesaba geçen)" : "Toplam gider"}
              </td>
              <td className="td text-right">{fmtMoney(bookedTotal)}</td>
              <td className="td" />
            </tr>
            {isIncome && plannedTotal > 0 ? (
              <tr className="bg-amber-50/80 text-sm font-medium text-amber-900">
                <td className="td" colSpan={2}>
                  Planlanmış (henüz hesaba geçmedi)
                </td>
                <td className="td text-right">{fmtMoney(plannedTotal)}</td>
                <td className="td" />
              </tr>
            ) : null}
          </tfoot>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center print:hidden">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setSelected(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 my-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
          >
            <div className={`px-5 pb-4 pt-5 ${isIncome ? "bg-gradient-to-br from-emerald-50 to-white" : "bg-gradient-to-br from-rose-50 to-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {isIncome ? "Gelir detayı" : "Gider detayı"}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">{selected.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TagBadge tag={selected.tag} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/80 hover:text-slate-700"
                  aria-label="Kapat"
                >
                  ✕
                </button>
              </div>
              <p className={`mt-4 text-2xl font-bold tracking-tight ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>
                {fmtMoney(selected.amount)}
              </p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-2">
                <MetaPill label="Tarih" value={fmtDate(selected.occurredAt)} />
                <MetaPill label="Ödeme kanalı" value={channelDisplay} />
              </div>

              <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50/80 px-3 ring-1 ring-slate-100">
                {isIncome ? (
                  <>
                    <DetailRow
                      label="Gelir kalemi"
                      value={
                        selected.incomeCategory
                          ? INCOME_CATEGORY_TR[selected.incomeCategory]
                          : null
                      }
                    />
                    <DetailRow
                      label="Ödeme yapan"
                      value={[selected.payerFirstName, selected.payerLastName].filter(Boolean).join(" ")}
                    />
                    {selected.payerIdentityNo ? (
                      <DetailRow label="TC kimlik" value={selected.payerIdentityNo} />
                    ) : null}
                  </>
                ) : (
                  <>
                    <DetailRow label="Harcama yapılan" value={selected.expenseTitle} />
                    <DetailRow label="Talep eden" value={parseNoteField(selected.notes, "Talep eden")} />
                    <DetailRow
                      label="Ödeme yapılan / tedarikçi"
                      value={selected.payeeIdentityNo}
                    />
                    <DetailRow label="Açıklama" value={selected.invoiceNo} />
                  </>
                )}
                <DetailRow
                  label={
                    isIncome && selected.channel === "BANK"
                      ? "Banka hesabı"
                      : "Banka"
                  }
                  value={selected.bankName}
                />
                <DetailRow
                  label="Çek vade sayısı"
                  value={
                    selected.checkInstallments != null ? String(selected.checkInstallments) : null
                  }
                />
                <DetailRow
                  label="Açıklama"
                  value={isIncome ? humanizeNotes(selected.notes) : leftoverNotes(selected.notes)}
                />
              </dl>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              {selected.href ? (
                <Link href={selected.href} className="text-sm font-medium text-brand-700 hover:underline">
                  Kaynağa git →
                </Link>
              ) : (
                <span />
              )}
              {canWrite && selected.deletable ? (
                <button
                  type="button"
                  disabled={deleting}
                  className="rounded-lg px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  onClick={() => void handleDelete()}
                >
                  {deleting ? "Siliniyor…" : "Kaydı sil"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
