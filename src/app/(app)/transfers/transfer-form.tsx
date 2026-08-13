"use client";

import { useActionState, useMemo, useState } from "react";
import { createTransferAction } from "@/app/actions/transfers";
import { emptyState } from "@/app/actions/types";
import { FormError, SubmitButton } from "@/components/ui";
import { todayISO } from "@/lib/format";

interface AccountOpt { id: string; code: string; name: string }
interface CompanyOpt { id: string; name: string; accounts: AccountOpt[] }

export function TransferForm({ companies }: { companies: CompanyOpt[] }) {
  const [state, action] = useActionState(createTransferAction, emptyState);
  const [fromCompanyId, setFromCompanyId] = useState(companies[0]?.id ?? "");
  const [toCompanyId, setToCompanyId] = useState(companies[1]?.id ?? "");

  const fromAccounts = useMemo(
    () => companies.find((c) => c.id === fromCompanyId)?.accounts ?? [],
    [companies, fromCompanyId],
  );
  const toAccounts = useMemo(
    () => companies.find((c) => c.id === toCompanyId)?.accounts ?? [],
    [companies, toCompanyId],
  );

  const defaultBank = (accts: AccountOpt[]) => accts.find((a) => a.code === "102")?.id ?? accts[0]?.id ?? "";

  return (
    <form action={action} className="card space-y-4 p-6">
      <FormError message={state.error} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="fromCompanyId">Gönderen şirket</label>
          <select id="fromCompanyId" name="fromCompanyId" className="input" value={fromCompanyId}
            onChange={(e) => setFromCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="toCompanyId">Alan şirket</label>
          <select id="toCompanyId" name="toCompanyId" className="input" value={toCompanyId}
            onChange={(e) => setToCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fromAccountId">Gönderen hesap (kasa/banka)</label>
          <select id="fromAccountId" name="fromAccountId" className="input" defaultValue={defaultBank(fromAccounts)} key={fromCompanyId}>
            {fromAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="toAccountId">Alan hesap (kasa/banka)</label>
          <select id="toAccountId" name="toAccountId" className="input" defaultValue={defaultBank(toAccounts)} key={toCompanyId}>
            {toAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">Tutar</label>
          <input id="amount" name="amount" className="input" inputMode="decimal" required />
        </div>
        <div>
          <label className="label" htmlFor="date">Tarih</label>
          <input id="date" name="date" type="date" className="input" defaultValue={todayISO()} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Açıklama</label>
        <input id="description" name="description" className="input" placeholder="Grup içi nakit desteği" />
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Kayıt sonucu: Gönderen şirkette <b>Grup Şirketlerinden Alacaklar (133)</b> borçlanır, banka alacaklanır.
        Alan şirkette banka borçlanır, <b>Grup Şirketlerine Borçlar (336)</b> alacaklanır. İki fiş tek transaction içinde oluşur.
      </div>
      <div className="flex justify-end">
        <SubmitButton>Transferi gerçekleştir</SubmitButton>
      </div>
    </form>
  );
}
