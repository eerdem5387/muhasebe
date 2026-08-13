"use client";

import { useActionState, useMemo, useState } from "react";
import { createManualEntryAction } from "@/app/actions/journal";
import { emptyState } from "@/app/actions/types";
import { FormError, SubmitButton } from "@/components/ui";
import { fmtMoney, todayISO } from "@/lib/format";

interface AccountOpt { id: string; code: string; name: string }
interface ContactOpt { id: string; name: string }

interface Line {
  key: number;
  accountId: string;
  contactId: string;
  debit: string;
  credit: string;
}

let counter = 1;
const newLine = (): Line => ({ key: counter++, accountId: "", contactId: "", debit: "", credit: "" });

export function ManualEntryForm({ accounts, contacts }: { accounts: AccountOpt[]; contacts: ContactOpt[] }) {
  const [state, action] = useActionState(createManualEntryAction, emptyState);
  const [lines, setLines] = useState<Line[]>([newLine(), newLine()]);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      debit += Number(l.debit.replace(",", ".")) || 0;
      credit += Number(l.credit.replace(",", ".")) || 0;
    }
    return { debit, credit, diff: debit - credit };
  }, [lines]);

  const balanced = Math.abs(totals.diff) < 0.005 && totals.debit > 0;

  const payload = JSON.stringify(
    lines.map((l) => ({
      accountId: l.accountId,
      contactId: l.contactId,
      debit: l.debit.replace(",", "."),
      credit: l.credit.replace(",", "."),
    })),
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lines" value={payload} />
      <FormError message={state.error} />

      <div className="card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="date">Fiş tarihi</label>
            <input id="date" name="date" type="date" className="input" defaultValue={todayISO()} required />
          </div>
          <div>
            <label className="label" htmlFor="description">Açıklama</label>
            <input id="description" name="description" className="input" placeholder="Fiş açıklaması" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Hesap</th>
              <th className="th">Cari (ops.)</th>
              <th className="th w-40 text-right">Borç</th>
              <th className="th w-40 text-right">Alacak</th>
              <th className="th w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => (
              <tr key={l.key}>
                <td className="td">
                  <select className="input" value={l.accountId} onChange={(e) => update(l.key, { accountId: e.target.value })}>
                    <option value="">Hesap seçin…</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                  </select>
                </td>
                <td className="td">
                  <select className="input" value={l.contactId} onChange={(e) => update(l.key, { contactId: e.target.value })}>
                    <option value="">-</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="td">
                  <input className="input text-right" inputMode="decimal" value={l.debit}
                    onChange={(e) => update(l.key, { debit: e.target.value, credit: "" })} />
                </td>
                <td className="td">
                  <input className="input text-right" inputMode="decimal" value={l.credit}
                    onChange={(e) => update(l.key, { credit: e.target.value, debit: "" })} />
                </td>
                <td className="td text-right">
                  {lines.length > 2 && (
                    <button type="button" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                      className="text-red-500 hover:text-red-700">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <button type="button" onClick={() => setLines((p) => [...p, newLine()])} className="btn-secondary">+ Satır ekle</button>
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Toplam Borç</span><span>{fmtMoney(totals.debit)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Toplam Alacak</span><span>{fmtMoney(totals.credit)}</span></div>
            <div className={`flex justify-between border-t border-slate-200 pt-1 font-semibold ${balanced ? "text-emerald-600" : "text-red-600"}`}>
              <span>Fark</span><span>{fmtMoney(totals.diff)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {!balanced && <span className="text-sm text-red-600">Borç ve alacak eşit olmalı.</span>}
        <SubmitButton>Fişi kaydet</SubmitButton>
      </div>
    </form>
  );
}
