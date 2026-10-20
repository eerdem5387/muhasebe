"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { createCashbookExpenseAction, createCashbookIncomeAction } from "@/app/actions/cashbook";
import { CASHBOOK_CHANNEL_TR } from "@/lib/cashbook";
import { todayISO } from "@/lib/format";

export type CashbookStudentOption = {
  id: string;
  fullName: string;
  classroom: string | null;
};

type PaymentLine = {
  key: string;
  channel: string;
  bankName: string;
  checkInstallments: string;
  amount: string;
  occurredAt: string;
};

const CHANNEL_OPTIONS = [
  { value: "BANK", label: CASHBOOK_CHANNEL_TR.BANK },
  { value: "CHECK", label: CASHBOOK_CHANNEL_TR.CHECK },
  { value: "CREDIT_CARD", label: CASHBOOK_CHANNEL_TR.CREDIT_CARD },
  { value: "CASH", label: CASHBOOK_CHANNEL_TR.CASH },
  { value: "PROMISSORY", label: CASHBOOK_CHANNEL_TR.PROMISSORY },
] as const;

function newPaymentLine(defaultDay: string): PaymentLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channel: "CASH",
    bankName: "",
    checkInstallments: "",
    amount: "",
    occurredAt: defaultDay,
  };
}

function ChannelFields({ idPrefix }: { idPrefix: string }) {
  const [channel, setChannel] = useState("CASH");
  return (
    <>
      <div>
        <label className="label" htmlFor={`${idPrefix}-channel`}>Ödeme kanalı</label>
        <select
          id={`${idPrefix}-channel`}
          name="channel"
          className="input"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          required
        >
          {CHANNEL_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      {(channel === "CREDIT_CARD" || channel === "CHECK") && (
        <div>
          <label className="label" htmlFor={`${idPrefix}-bank`}>Banka adı</label>
          <input id={`${idPrefix}-bank`} name="bankName" className="input" required />
        </div>
      )}
      {channel === "CHECK" && (
        <div>
          <label className="label" htmlFor={`${idPrefix}-installments`}>Çek vade sayısı</label>
          <input
            id={`${idPrefix}-installments`}
            name="checkInstallments"
            type="number"
            min={1}
            max={48}
            className="input"
            required
          />
        </div>
      )}
    </>
  );
}

export function IncomeAddModal({
  month,
  students,
}: {
  month: string;
  students: CashbookStudentOption[];
}) {
  const defaultDay = todayISO().startsWith(month) ? todayISO() : `${month}-01`;
  const [category, setCategory] = useState("STUDENT");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [payments, setPayments] = useState<PaymentLine[]>(() => [newPaymentLine(defaultDay)]);

  const selectedStudent = students.find((s) => s.id === studentId);
  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return students.slice(0, 40);
    return students
      .filter((s) =>
        [s.fullName, s.classroom ?? ""].join(" ").toLocaleLowerCase("tr-TR").includes(q),
      )
      .slice(0, 40);
  }, [students, studentQuery]);

  const isStudent = category === "STUDENT";
  const paymentsJson = JSON.stringify(
    payments.map((p) => ({
      channel: p.channel,
      bankName: p.bankName || null,
      checkInstallments: p.checkInstallments || null,
      amount: p.amount,
      occurredAt: p.occurredAt,
    })),
  );

  function updatePayment(key: string, patch: Partial<PaymentLine>) {
    setPayments((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <FormModal buttonLabel="Gelir ekle" title="Gelir ekle" buttonClassName="btn-secondary !py-1.5 text-xs" size="lg">
      <ActionForm action={createCashbookIncomeAction} submitLabel="Kaydet">
        <input type="hidden" name="yearMonth" value={month} />
        <input type="hidden" name="paymentsJson" value={paymentsJson} />
        <div>
          <label className="label" htmlFor="income-category">Gelir kalemi</label>
          <select
            id="income-category"
            name="incomeCategory"
            className="input"
            required
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setStudentId("");
              setStudentQuery("");
            }}
          >
            <option value="STUDENT">Öğrenci</option>
            <option value="TRIP">Gezi</option>
            <option value="FOOD">Yemek</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>

        {isStudent ? (
          <div className="space-y-2">
            <label className="label" htmlFor="student-search">Öğrenci ara</label>
            <input
              id="student-search"
              className="input"
              placeholder="Ad yazarak arayın…"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              autoComplete="off"
            />
            <input type="hidden" name="studentId" value={studentId} />
            <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200">
              {filteredStudents.map((s) => {
                const active = s.id === studentId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      active ? "bg-brand-50 text-brand-800" : "text-slate-700"
                    }`}
                    onClick={() => {
                      setStudentId(s.id);
                      setStudentQuery(s.fullName);
                    }}
                  >
                    <span>
                      {s.fullName}
                      {s.classroom ? ` · ${s.classroom}` : ""}
                    </span>
                  </button>
                );
              })}
              {filteredStudents.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">Öğrenci bulunamadı.</p>
              ) : null}
            </div>
            {selectedStudent ? (
              <p className="text-xs text-slate-500">Seçili: {selectedStudent.fullName}</p>
            ) : (
              <p className="text-xs text-amber-700">Öğrenci seçimi zorunlu.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payer-first">Ödeme yapan — Ad</label>
              <input id="payer-first" name="payerFirstName" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="payer-last">Soyad</label>
              <input id="payer-last" name="payerLastName" className="input" required />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ödemeler</p>
            <button
              type="button"
              className="btn-secondary !py-1 text-xs"
              onClick={() => setPayments((rows) => [...rows, newPaymentLine(defaultDay)])}
            >
              + Ödeme ekle
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Aynı öğrenci için nakit + kredi kartı gibi birden fazla kanalı, farklı tarihlerle girebilirsiniz.
          </p>

          {payments.map((pay, index) => (
            <div key={pay.key} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Ödeme #{index + 1}</p>
                {payments.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => setPayments((rows) => rows.filter((r) => r.key !== pay.key))}
                  >
                    Sil
                  </button>
                ) : null}
              </div>
              <div>
                <label className="label" htmlFor={`ch-${pay.key}`}>Ödeme kanalı</label>
                <select
                  id={`ch-${pay.key}`}
                  className="input"
                  value={pay.channel}
                  onChange={(e) => updatePayment(pay.key, { channel: e.target.value })}
                >
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {(pay.channel === "CREDIT_CARD" || pay.channel === "CHECK") && (
                <div>
                  <label className="label" htmlFor={`bank-${pay.key}`}>Banka adı</label>
                  <input
                    id={`bank-${pay.key}`}
                    className="input"
                    value={pay.bankName}
                    onChange={(e) => updatePayment(pay.key, { bankName: e.target.value })}
                    required
                  />
                </div>
              )}
              {pay.channel === "CHECK" && (
                <div>
                  <label className="label" htmlFor={`inst-${pay.key}`}>Çek vade sayısı</label>
                  <input
                    id={`inst-${pay.key}`}
                    type="number"
                    min={1}
                    max={48}
                    className="input"
                    value={pay.checkInstallments}
                    onChange={(e) => updatePayment(pay.key, { checkInstallments: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor={`amt-${pay.key}`}>Tutar</label>
                  <input
                    id={`amt-${pay.key}`}
                    className="input"
                    value={pay.amount}
                    onChange={(e) => updatePayment(pay.key, { amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`date-${pay.key}`}>Tarih</label>
                  <input
                    id={`date-${pay.key}`}
                    type="date"
                    className="input"
                    value={pay.occurredAt}
                    onChange={(e) => updatePayment(pay.key, { occurredAt: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ActionForm>
    </FormModal>
  );
}

export function ExpenseAddModal({ month }: { month: string }) {
  const defaultDay = todayISO().startsWith(month) ? todayISO() : `${month}-01`;

  return (
    <FormModal buttonLabel="Gider ekle" title="Gider ekle" buttonClassName="btn-secondary !py-1.5 text-xs" size="lg">
      <ActionForm action={createCashbookExpenseAction} submitLabel="Kaydet">
        <input type="hidden" name="yearMonth" value={month} />
        <div>
          <label className="label" htmlFor="expense-requester">Talep eden</label>
          <input id="expense-requester" name="requesterName" className="input" required placeholder="Ad soyad" />
        </div>
        <div>
          <label className="label" htmlFor="expense-title">Harcama yapılan (ürün, hizmet, maaş, vb)</label>
          <input id="expense-title" name="expenseTitle" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="payee-id">Ödeme yapılan (vergi no veya TC)</label>
          <input id="payee-id" name="payeeIdentityNo" className="input" inputMode="numeric" maxLength={11} required />
        </div>
        <ChannelFields idPrefix="expense" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="expense-amount">Tutar</label>
            <input id="expense-amount" name="amount" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="expense-date">Tarih</label>
            <input id="expense-date" name="occurredAt" type="date" className="input" defaultValue={defaultDay} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="invoice-no">Fatura no</label>
          <input id="invoice-no" name="invoiceNo" className="input" required />
        </div>
      </ActionForm>
    </FormModal>
  );
}
