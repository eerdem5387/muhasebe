"use client";

import { useState } from "react";
import Link from "next/link";
import { MiniForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { deleteCashbookEntryAction } from "@/app/actions/cashbook";
import { CASHBOOK_CHANNEL_TR, INCOME_CATEGORY_TR } from "@/lib/cashbook";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { MonthlyLedgerRow } from "@/server/monthly-ledger";

export type CashbookRow = MonthlyLedgerRow;

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b border-slate-100 py-2 sm:grid sm:grid-cols-3 sm:gap-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 sm:col-span-2 sm:mt-0">{value}</dd>
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
  const isIncome = side === "INCOME";

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
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSelected(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 my-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isIncome ? "Gelir detayı" : "Gider detayı"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{selected.title}</h2>
                <div className="mt-2">
                  <TagBadge tag={selected.tag} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <dl>
              {isIncome ? (
                <>
                  <DetailField
                    label="Gelir kalemi"
                    value={
                      selected.incomeCategory
                        ? INCOME_CATEGORY_TR[selected.incomeCategory]
                        : null
                    }
                  />
                  <DetailField
                    label="Ödeme yapan"
                    value={[selected.payerFirstName, selected.payerLastName].filter(Boolean).join(" ")}
                  />
                  <DetailField label="TC kimlik" value={selected.payerIdentityNo} />
                </>
              ) : (
                <>
                  <DetailField label="Harcama yapılan" value={selected.expenseTitle} />
                  <DetailField label="Vergi no / TC" value={selected.payeeIdentityNo} />
                  <DetailField label="Fatura no" value={selected.invoiceNo} />
                </>
              )}
              <DetailField
                label="Ödeme kanalı"
                value={
                  selected.channel
                    ? CASHBOOK_CHANNEL_TR[selected.channel]
                    : selected.channelLabel
                }
              />
              <DetailField label="Banka" value={selected.bankName} />
              <DetailField
                label="Çek vade sayısı"
                value={
                  selected.checkInstallments != null ? String(selected.checkInstallments) : null
                }
              />
              <DetailField label="Tutar" value={fmtMoney(selected.amount)} />
              <DetailField label="Tarih" value={fmtDate(selected.occurredAt)} />
              <DetailField label="Not" value={selected.notes} />
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              {selected.href ? (
                <Link href={selected.href} className="text-sm font-medium text-brand-700 hover:underline">
                  Kaynağa git →
                </Link>
              ) : (
                <span />
              )}
              {canWrite && selected.deletable ? (
                <MiniForm action={deleteCashbookEntryAction}>
                  <input type="hidden" name="id" value={selected.id} />
                  <input type="hidden" name="yearMonth" value={month} />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => setSelected(null)}
                  >
                    Kaydı sil
                  </button>
                </MiniForm>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
