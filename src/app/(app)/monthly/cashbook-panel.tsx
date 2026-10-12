"use client";

import { useState } from "react";
import { MiniForm } from "@/components/action-form";
import { deleteCashbookEntryAction } from "@/app/actions/cashbook";
import { CASHBOOK_CHANNEL_TR, INCOME_CATEGORY_TR, cashbookTitle } from "@/lib/cashbook";
import { fmtDate, fmtMoney } from "@/lib/format";

export type CashbookRow = {
  id: string;
  side: "INCOME" | "EXPENSE";
  amount: number;
  occurredAt: string;
  channel: keyof typeof CASHBOOK_CHANNEL_TR;
  bankName: string | null;
  checkInstallments: number | null;
  incomeCategory: keyof typeof INCOME_CATEGORY_TR | null;
  payerFirstName: string | null;
  payerLastName: string | null;
  payerIdentityNo: string | null;
  expenseTitle: string | null;
  payeeIdentityNo: string | null;
  invoiceNo: string | null;
  notes: string | null;
};

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b border-slate-100 py-2 sm:grid sm:grid-cols-3 sm:gap-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  );
}

export function CashbookPanel({
  side,
  month,
  rows,
  canWrite,
}: {
  side: "INCOME" | "EXPENSE";
  month: string;
  rows: CashbookRow[];
  canWrite: boolean;
}) {
  const [selected, setSelected] = useState<CashbookRow | null>(null);
  const isIncome = side === "INCOME";
  const total = rows.reduce((s, r) => s + r.amount, 0);

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
                className="cursor-pointer border-b border-slate-300 bg-white hover:bg-brand-50/60"
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                  {cashbookTitle(row)}
                </td>
                <td className="td text-slate-600">{CASHBOOK_CHANNEL_TR[row.channel]}</td>
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
                {isIncome ? "Toplam gelir" : "Toplam gider"}
              </td>
              <td className="td text-right">{fmtMoney(total)}</td>
              <td className="td" />
            </tr>
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
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{cashbookTitle(selected)}</h2>
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
              <DetailField label="Ödeme kanalı" value={CASHBOOK_CHANNEL_TR[selected.channel]} />
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
            {canWrite ? (
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
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
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
