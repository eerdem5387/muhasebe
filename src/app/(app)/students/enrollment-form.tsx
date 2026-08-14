"use client";

import { useMemo, useState } from "react";
import { createEnrollmentAction } from "@/app/actions/students";
import { ActionForm } from "@/components/action-form";
import { fmtMoney, todayISO, toYearMonth } from "@/lib/format";

interface Bank { id: string; bankName: string; blockDays: number }
interface Student { id: string; fullName: string }

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

export function EnrollmentForm({ students, banks }: { students: Student[]; banks: Bank[] }) {
  const [channel, setChannel] = useState("EFT");
  const [fee, setFee] = useState("100000");
  const [count, setCount] = useState("10");
  const [bankId, setBankId] = useState(banks[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const year = new Date().getFullYear();

  const preview = useMemo(() => {
    const n = Number(fee.replace(",", ".")) || 0;
    const inst = channel === "CREDIT_CARD" ? Math.max(1, Number(count) || 1) : 1;
    const bank = banks.find((b) => b.id === bankId);
    const block = channel === "CREDIT_CARD" ? (bank?.blockDays ?? 0) : 0;
    const base = Math.round((n / inst) * 100) / 100;
    const rows = [];
    let allocated = 0;
    for (let i = 0; i < inst; i++) {
      const amount = i === inst - 1 ? Math.round((n - allocated) * 100) / 100 : base;
      allocated += amount;
      const release = addDays(date, i * 30 + block);
      rows.push({ i: i + 1, amount, release, ym: toYearMonth(release) });
    }
    return rows;
  }, [fee, count, channel, bankId, date, banks]);

  return (
    <ActionForm action={createEnrollmentAction} submitLabel="Kaydı oluştur">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="studentId">Öğrenci</label>
          <select id="studentId" name="studentId" className="input" required>
            <option value="">Seçin…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="academicYear">Eğitim yılı</label>
          <input id="academicYear" name="academicYear" className="input" defaultValue={`${year}-${year + 1}`} required />
        </div>
        <div>
          <label className="label" htmlFor="enrolledAt">Kayıt tarihi</label>
          <input id="enrolledAt" name="enrolledAt" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="annualFee">Yıllık ücret</label>
          <input id="annualFee" name="annualFee" className="input" value={fee} onChange={(e) => setFee(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="paymentChannel">Ödeme şekli</label>
          <select id="paymentChannel" name="paymentChannel" className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="EFT">EFT / Havale</option>
            <option value="CREDIT_CARD">Kredi kartı</option>
            <option value="CHECK">Çek</option>
            <option value="CASH">Nakit</option>
          </select>
        </div>
        {channel === "CREDIT_CARD" && (
          <>
            <div>
              <label className="label" htmlFor="cardBankId">Banka anlaşması</label>
              <select id="cardBankId" name="cardBankId" className="input" value={bankId} onChange={(e) => setBankId(e.target.value)}>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.bankName} ({b.blockDays} gün bloke)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="installmentCount">Taksit sayısı</label>
              <input id="installmentCount" name="installmentCount" className="input" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">Not</label>
          <input id="notes" name="notes" className="input" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="mb-2 font-medium text-slate-700">Gelire dönüşme planı</p>
        <ul className="space-y-1">
          {preview.map((r) => (
            <li key={r.i} className="flex justify-between gap-4">
              <span>Taksit {r.i} · {r.ym}</span>
              <span className="font-medium">{fmtMoney(r.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </ActionForm>
  );
}
