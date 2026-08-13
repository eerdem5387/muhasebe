"use client";

import { useActionState, useMemo, useState } from "react";
import { createInvoiceAction } from "@/app/actions/accounting";
import { emptyState } from "@/app/actions/types";
import { FormError, SubmitButton } from "@/components/ui";
import { fmtMoney, todayISO } from "@/lib/format";

interface ContactOpt {
  id: string;
  name: string;
  taxNumber?: string | null;
  tckn?: string | null;
  taxOffice?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
}
interface ProductOpt { id: string; name: string; defaultPrice: string; unit: string }
interface TaxOpt { id: string; name: string; rate: number }

interface Line {
  key: number;
  productId: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxId: string;
}

let counter = 1;
const newLine = (): Line => ({
  key: counter++, productId: "", description: "", unit: "Adet",
  quantity: "1", unitPrice: "0", discountRate: "0", taxId: "",
});

const num = (s: string) => Number(s.replace(",", ".")) || 0;

export function InvoiceForm({
  contacts,
  products,
  taxes,
}: {
  contacts: ContactOpt[];
  products: ProductOpt[];
  taxes: TaxOpt[];
}) {
  const [state, action] = useActionState(createInvoiceAction, emptyState);
  const [priceMode, setPriceMode] = useState<"EXCLUSIVE" | "INCLUSIVE">("EXCLUSIVE");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [contactId, setContactId] = useState("");

  const selected = contacts.find((c) => c.id === contactId);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onProductChange = (key: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    update(key, {
      productId,
      unitPrice: p ? p.defaultPrice : "0",
      description: p ? p.name : "",
      unit: p ? p.unit : "Adet",
    });
  };

  const compute = (l: Line) => {
    const q = num(l.quantity);
    const up = num(l.unitPrice);
    const rate = Number(taxes.find((t) => t.id === l.taxId)?.rate ?? 0);
    const gross = q * up;
    const discount = (gross * num(l.discountRate)) / 100;
    const base = gross - discount;
    let net: number;
    let tax: number;
    if (priceMode === "INCLUSIVE") {
      net = rate ? base / (1 + rate / 100) : base;
      tax = base - net;
    } else {
      net = base;
      tax = (base * rate) / 100;
    }
    return { discount, net, tax, lineTotal: net + tax };
  };

  const totals = useMemo(() => {
    let net = 0, tax = 0, discount = 0;
    for (const l of lines) {
      const c = compute(l);
      net += c.net; tax += c.tax; discount += c.discount;
    }
    return { net, tax, discount, grand: net + tax };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, taxes, priceMode]);

  const linesPayload = JSON.stringify(
    lines.map((l) => ({
      productId: l.productId,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity.replace(",", "."),
      unitPrice: l.unitPrice.replace(",", "."),
      discountRate: l.discountRate.replace(",", "."),
      taxId: l.taxId,
    })),
  );

  const addr = selected
    ? [selected.address, selected.neighborhood, selected.district, selected.city].filter(Boolean).join(" ")
    : "";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lines" value={linesPayload} />
      <input type="hidden" name="priceMode" value={priceMode} />
      <FormError message={state.error} />

      <div className="card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="type">Fatura türü</label>
            <select id="type" name="type" className="input" defaultValue="SALES">
              <option value="SALES">Satış</option>
              <option value="PURCHASE">Alış</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="einvoiceProfile">Senaryo / Profil</label>
            <select id="einvoiceProfile" name="einvoiceProfile" className="input" defaultValue="EARSIV">
              <option value="EARSIV">e-Arşiv Fatura</option>
              <option value="EFATURA">e-Fatura</option>
              <option value="NONE">Normal (kağıt)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dispatchType">Gönderim şekli</label>
            <select id="dispatchType" name="dispatchType" className="input" defaultValue="ELEKTRONIK">
              <option value="ELEKTRONIK">Elektronik</option>
              <option value="KAGIT">Kağıt</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="contactId">Cari</label>
            <select
              id="contactId" name="contactId" className="input" required
              value={contactId} onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">Seçin…</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="invoiceNumber">Fatura no</label>
            <input id="invoiceNumber" name="invoiceNumber" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="issueDate">Tarih</label>
            <input id="issueDate" name="issueDate" type="date" className="input" defaultValue={todayISO()} required />
          </div>
          <div>
            <label className="label" htmlFor="issueTime">Oluşma saati</label>
            <input id="issueTime" name="issueTime" type="time" step={1} className="input"
              defaultValue={new Date().toTimeString().slice(0, 8)} />
          </div>
          <div>
            <label className="label" htmlFor="dueDate">Vade tarihi</label>
            <input id="dueDate" name="dueDate" type="date" className="input" />
          </div>
        </div>

        {selected && (
          <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 p-4 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">SAYIN</div>
            <div className="font-semibold text-slate-900">{selected.name}</div>
            {addr && <div className="text-slate-600">{addr}</div>}
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-0.5 text-slate-600">
              {selected.taxOffice && <span>Vergi Dairesi: <strong>{selected.taxOffice}</strong></span>}
              {selected.taxNumber && <span>VKN: <strong>{selected.taxNumber}</strong></span>}
              {selected.tckn && <span>TCKN: <strong>{selected.tckn}</strong></span>}
              {selected.phone && <span>Tel: {selected.phone}</span>}
              {selected.email && <span>{selected.email}</span>}
            </div>
            {(!selected.taxNumber && !selected.tckn) && (
              <div className="mt-2 text-xs text-amber-700">
                Bu carinin VKN/TCKN bilgisi eksik. <a href={`/contacts/${selected.id}/edit`} className="underline">Cariyi düzenleyin</a>.
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <label className="label" htmlFor="note">Not</label>
          <input id="note" name="note" className="input" placeholder="Fatura notu (opsiyonel)" />
        </div>
        <div className="mt-4">
          <label className="label">Fiyat türü</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={priceMode === "EXCLUSIVE"} onChange={() => setPriceMode("EXCLUSIVE")} />
              KDV hariç
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={priceMode === "INCLUSIVE"} onChange={() => setPriceMode("INCLUSIVE")} />
              KDV dahil
            </label>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Mal / Hizmet</th>
              <th className="th w-20 text-right">Miktar</th>
              <th className="th w-24">Birim</th>
              <th className="th w-32 text-right">Birim Fiyat</th>
              <th className="th w-24 text-right">İskonto %</th>
              <th className="th w-32">KDV</th>
              <th className="th w-32 text-right">Tutar</th>
              <th className="th w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => {
              const c = compute(l);
              return (
                <tr key={l.key}>
                  <td className="td min-w-[16rem]">
                    <div className="flex flex-col gap-1">
                      <select className="input" value={l.productId} onChange={(e) => onProductChange(l.key, e.target.value)}>
                        <option value="">Serbest kalem</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input className="input text-xs" placeholder="Açıklama (opsiyonel)"
                        value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
                    </div>
                  </td>
                  <td className="td">
                    <input className="input text-right" inputMode="decimal" value={l.quantity}
                      onChange={(e) => update(l.key, { quantity: e.target.value })} />
                  </td>
                  <td className="td">
                    <input className="input" value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })} />
                  </td>
                  <td className="td">
                    <input className="input text-right" inputMode="decimal" value={l.unitPrice}
                      onChange={(e) => update(l.key, { unitPrice: e.target.value })} />
                  </td>
                  <td className="td">
                    <input className="input text-right" inputMode="decimal" value={l.discountRate}
                      onChange={(e) => update(l.key, { discountRate: e.target.value })} />
                  </td>
                  <td className="td">
                    <select className="input" value={l.taxId} onChange={(e) => update(l.key, { taxId: e.target.value })}>
                      <option value="">Vergisiz</option>
                      {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="td text-right font-medium">{fmtMoney(c.lineTotal)}</td>
                  <td className="td text-right">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                        className="text-red-500 hover:text-red-700">×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 p-4">
          <button type="button" onClick={() => setLines((p) => [...p, newLine()])} className="btn-secondary">
            + Kalem ekle
          </button>
          <div className="w-64 space-y-1 text-sm">
            {totals.discount > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">İskonto</span><span>-{fmtMoney(totals.discount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">KDV Matrahı</span><span>{fmtMoney(totals.net)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Hesaplanan KDV</span><span>{fmtMoney(totals.tax)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <span>Ödenecek Tutar</span><span>{fmtMoney(totals.grand)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingText="Kaydediliyor...">Faturayı kaydet ve muhasebeleştir</SubmitButton>
      </div>
    </form>
  );
}
