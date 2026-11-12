"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import {
  createCashbookExpenseAction,
  createCashbookIncomeAction,
  updateCashbookExpenseAction,
} from "@/app/actions/cashbook";
import { CASHBOOK_CHANNEL_TR } from "@/lib/cashbook";
import { todayISO } from "@/lib/format";
import { MoneyInput } from "@/components/money-input";
import type { MonthlyLedgerRow } from "@/server/monthly-ledger";

export type CashbookStudentOption = {
  id: string;
  fullName: string;
  classroom: string | null;
};

export type NamedAccountOption = {
  id: string;
  name: string;
};

type PaymentLine = {
  key: string;
  channel: string;
  bankName: string;
  checkInstallments: string;
  amount: string;
  occurredAt: string;
};

/** Gelir: CREDIT_CARD = POS tahsilatı. Gider: CREDIT_CARD = okul harcama kartı. */
const INCOME_CHANNEL_OPTIONS = [
  { value: "BANK", label: "EFT / Havale" },
  { value: "CHECK", label: CASHBOOK_CHANNEL_TR.CHECK },
  { value: "CREDIT_CARD", label: "POS" },
  { value: "CASH", label: CASHBOOK_CHANNEL_TR.CASH },
  { value: "PROMISSORY", label: CASHBOOK_CHANNEL_TR.PROMISSORY },
] as const;

const EXPENSE_CHANNEL_OPTIONS = [
  { value: "BANK", label: CASHBOOK_CHANNEL_TR.BANK },
  { value: "CHECK", label: CASHBOOK_CHANNEL_TR.CHECK },
  { value: "CREDIT_CARD", label: "Kredi kartı" },
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

function AccountSelect({
  id,
  name,
  label,
  options,
  value,
  defaultValue,
  onChange,
  emptyHint,
}: {
  id: string;
  /** Form alanı adı; gelir satırlarında paymentsJson kullanıldığı için verilmez. */
  name?: string;
  label: string;
  options: NamedAccountOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  emptyHint: string;
}) {
  const controlled = value !== undefined;
  return (
    <div className="space-y-1.5">
      <label className="label" htmlFor={id}>{label}</label>
      <select
        id={id}
        {...(name ? { name } : {})}
        className="input"
        required
        {...(controlled
          ? { value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value) }
          : { defaultValue: defaultValue || "" })}
      >
        <option value="" disabled>
          Seçin…
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.name}>
            {o.name}
          </option>
        ))}
        {controlled && value && !options.some((o) => o.name === value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {!controlled && defaultValue && !options.some((o) => o.name === defaultValue) ? (
          <option value={defaultValue}>{defaultValue}</option>
        ) : null}
      </select>
      {options.length === 0 ? (
        <p className="text-xs text-amber-700">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function ChannelFields({
  idPrefix,
  defaultChannel = "CASH",
  defaultBankName = "",
  defaultCheckInstallments = "",
  bankAccounts = [],
  expenseCards = [],
}: {
  idPrefix: string;
  defaultChannel?: string;
  defaultBankName?: string;
  defaultCheckInstallments?: string;
  bankAccounts?: NamedAccountOption[];
  /** Okulun harcama kredi kartları */
  expenseCards?: NamedAccountOption[];
}) {
  const [channel, setChannel] = useState(defaultChannel);
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
          {EXPENSE_CHANNEL_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      {(channel === "BANK" || channel === "CHECK") && (
        <AccountSelect
          key={`${idPrefix}-${channel}-bank`}
          id={`${idPrefix}-bank`}
          name="bankName"
          label={channel === "BANK" ? "Banka hesabı" : "Çek bankası / hesap"}
          options={bankAccounts}
          defaultValue={defaultBankName}
          emptyHint="Ayarlar’dan banka hesabı ekleyin."
        />
      )}
      {channel === "CREDIT_CARD" && (
        <AccountSelect
          key={`${idPrefix}-card`}
          id={`${idPrefix}-bank`}
          name="bankName"
          label="Kredi kartı"
          options={expenseCards}
          defaultValue={defaultBankName}
          emptyHint="Ayarlar’dan harcama kredi kartı ekleyin."
        />
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
            defaultValue={defaultCheckInstallments}
            required
          />
        </div>
      )}
    </>
  );
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayISO();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function parseRequester(notes: string | null | undefined): string {
  if (!notes) return "";
  const m = notes.match(/Talep eden:\s*([^·]+)/i);
  return m?.[1]?.trim() || "";
}

export function CashbookIncomeForm({
  students,
  defaultDay,
  yearMonth,
  idPrefix = "income",
  submitLabel = "Kaydet",
  bankAccounts = [],
  posDevices = [],
}: {
  students: CashbookStudentOption[];
  defaultDay: string;
  /** Verilirse gizli alan olarak gönderilir; ay yine işlem tarihinden türetilir. */
  yearMonth?: string;
  idPrefix?: string;
  submitLabel?: string;
  bankAccounts?: NamedAccountOption[];
  /** POS cihazları (gelir tahsilatı) */
  posDevices?: NamedAccountOption[];
}) {
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
      bankName: p.bankName?.trim() || "",
      checkInstallments: p.checkInstallments?.trim() || "",
      amount: p.amount,
      occurredAt: p.occurredAt,
    })),
  );

  function updatePayment(key: string, patch: Partial<PaymentLine>) {
    setPayments((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <ActionForm action={createCashbookIncomeAction} submitLabel={submitLabel}>
      {yearMonth ? <input type="hidden" name="yearMonth" value={yearMonth} /> : null}
      <input type="hidden" name="paymentsJson" value={paymentsJson} />
      <div>
        <label className="label" htmlFor={`${idPrefix}-category`}>Gelir kalemi</label>
        <select
          id={`${idPrefix}-category`}
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
          <label className="label" htmlFor={`${idPrefix}-student-search`}>Öğrenci ara</label>
          <input
            id={`${idPrefix}-student-search`}
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
            <label className="label" htmlFor={`${idPrefix}-payer-first`}>Ödeme yapan — Ad</label>
            <input id={`${idPrefix}-payer-first`} name="payerFirstName" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor={`${idPrefix}-payer-last`}>Soyad</label>
            <input id={`${idPrefix}-payer-last`} name="payerLastName" className="input" required />
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
          Geçmiş bir tarih seçerseniz kayıt o aya düşer.
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
              <label className="label" htmlFor={`${idPrefix}-ch-${pay.key}`}>Ödeme kanalı</label>
              <select
                id={`${idPrefix}-ch-${pay.key}`}
                className="input"
                value={pay.channel}
                required
                onChange={(e) =>
                  updatePayment(pay.key, {
                    channel: e.target.value,
                    bankName:
                      e.target.value === "BANK" ||
                      e.target.value === "CREDIT_CARD" ||
                      e.target.value === "CHECK"
                        ? pay.bankName
                        : "",
                  })
                }
              >
                {INCOME_CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
              {(pay.channel === "BANK" || pay.channel === "CHECK") && (
              <AccountSelect
                id={`${idPrefix}-bank-${pay.key}`}
                label={pay.channel === "BANK" ? "Hangi banka hesabına?" : "Çek bankası / hesap"}
                options={bankAccounts}
                value={pay.bankName}
                onChange={(v) => updatePayment(pay.key, { bankName: v })}
                emptyHint="Ayarlar’dan banka hesabı ekleyin."
              />
            )}
            {pay.channel === "CREDIT_CARD" && (
              <AccountSelect
                id={`${idPrefix}-bank-${pay.key}`}
                label="POS"
                options={posDevices}
                value={pay.bankName}
                onChange={(v) => updatePayment(pay.key, { bankName: v })}
                emptyHint="Ayarlar’dan POS ekleyin."
              />
            )}
            {pay.channel === "CHECK" && (
              <div>
                <label className="label" htmlFor={`${idPrefix}-inst-${pay.key}`}>Çek vade sayısı</label>
                <input
                  id={`${idPrefix}-inst-${pay.key}`}
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
              <MoneyInput
                id={`${idPrefix}-amt-${pay.key}`}
                label="Tutar"
                value={pay.amount}
                onValueChange={(c) => updatePayment(pay.key, { amount: c })}
                required
              />
              <div>
                <label className="label" htmlFor={`${idPrefix}-date-${pay.key}`}>Tarih</label>
                <input
                  id={`${idPrefix}-date-${pay.key}`}
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

      <div>
        <label className="label" htmlFor={`${idPrefix}-notes`}>Açıklama</label>
        <input
          id={`${idPrefix}-notes`}
          name="notes"
          className="input"
          placeholder="Gelir açıklaması"
          required
          minLength={2}
        />
      </div>
    </ActionForm>
  );
}

export function IncomeAddModal({
  month,
  students,
  bankAccounts = [],
  posDevices = [],
}: {
  month: string;
  students: CashbookStudentOption[];
  bankAccounts?: NamedAccountOption[];
  posDevices?: NamedAccountOption[];
}) {
  const defaultDay = todayISO().startsWith(month) ? todayISO() : `${month}-01`;
  return (
    <FormModal buttonLabel="Gelir ekle" title="Gelir ekle" buttonClassName="btn-secondary !py-1.5 text-xs" size="lg">
      <CashbookIncomeForm
        students={students}
        defaultDay={defaultDay}
        yearMonth={month}
        bankAccounts={bankAccounts}
        posDevices={posDevices}
      />
    </FormModal>
  );
}

export function CashbookExpenseForm({
  defaultDay,
  yearMonth,
  idPrefix = "expense",
  submitLabel = "Kaydet",
  bankAccounts = [],
  expenseCards = [],
}: {
  defaultDay: string;
  yearMonth?: string;
  idPrefix?: string;
  submitLabel?: string;
  bankAccounts?: NamedAccountOption[];
  expenseCards?: NamedAccountOption[];
}) {
  const [expenseTitle, setExpenseTitle] = useState("");
  const [requesterName, setRequesterName] = useState("");

  return (
    <ActionForm action={createCashbookExpenseAction} submitLabel={submitLabel}>
      {yearMonth ? <input type="hidden" name="yearMonth" value={yearMonth} /> : null}
      <input type="hidden" name="expenseTitle" value={expenseTitle} />
      <input type="hidden" name="requesterName" value={requesterName} />

      <div>
        <label className="label" htmlFor={`${idPrefix}-kind`}>Harcama yapılan</label>
        <input
          id={`${idPrefix}-kind`}
          className="input"
          value={expenseTitle}
          onChange={(e) => setExpenseTitle(e.target.value)}
          placeholder="Örn. mikrofon, kira, kırtasiye"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="label" htmlFor={`${idPrefix}-payee`}>
          Ödeme Yapılan Kişi yada Kurum / Tedarikçi / Harcamanın Adı
        </label>
        <input
          id={`${idPrefix}-payee`}
          name="payeeIdentityNo"
          className="input"
          maxLength={200}
          placeholder="Örn. ABC Ltd. · muhasebe yazılımı aboneliği"
          autoComplete="off"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="label" htmlFor={`${idPrefix}-requester`}>Talep eden</label>
        <input
          id={`${idPrefix}-requester`}
          className="input"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          placeholder="Ad soyad"
          required
          minLength={2}
        />
      </div>

      <ChannelFields
        idPrefix={idPrefix}
        bankAccounts={bankAccounts}
        expenseCards={expenseCards}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MoneyInput id={`${idPrefix}-amount`} name="amount" label="Tutar" required />
        <div>
          <label className="label" htmlFor={`${idPrefix}-date`}>Tarih</label>
          <input
            id={`${idPrefix}-date`}
            name="occurredAt"
            type="date"
            className="input"
            defaultValue={defaultDay}
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-invoice`}>Açıklama</label>
        <input
          id={`${idPrefix}-invoice`}
          name="invoiceNo"
          className="input"
          placeholder="Harcama açıklaması"
          required
          minLength={2}
        />
      </div>
    </ActionForm>
  );
}

export function ExpenseAddModal({
  month,
  bankAccounts = [],
  expenseCards = [],
}: {
  month: string;
  bankAccounts?: NamedAccountOption[];
  expenseCards?: NamedAccountOption[];
}) {
  const defaultDay = todayISO().startsWith(month) ? todayISO() : `${month}-01`;
  return (
    <FormModal buttonLabel="Gider ekle" title="Gider ekle" buttonClassName="btn-secondary !py-1.5 text-xs" size="lg">
      <CashbookExpenseForm
        defaultDay={defaultDay}
        yearMonth={month}
        bankAccounts={bankAccounts}
        expenseCards={expenseCards}
      />
    </FormModal>
  );
}

/** Detay modalından gider düzenleme formu. */
export function ExpenseEditForm({
  entry,
  month,
  onDone,
  bankAccounts = [],
  expenseCards = [],
}: {
  entry: MonthlyLedgerRow;
  month: string;
  onDone?: () => void;
  bankAccounts?: NamedAccountOption[];
  expenseCards?: NamedAccountOption[];
}) {
  const initialRequester = parseRequester(entry.notes);
  const [expenseTitle, setExpenseTitle] = useState(entry.expenseTitle?.trim() || "");
  const [requesterName, setRequesterName] = useState(initialRequester);

  return (
    <ActionForm action={updateCashbookExpenseAction} submitLabel="Değişiklikleri kaydet" onSuccess={onDone}>
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="yearMonth" value={month} />
      <input type="hidden" name="expenseTitle" value={expenseTitle} />
      <input type="hidden" name="requesterName" value={requesterName} />

      <div>
        <label className="label" htmlFor="edit-expense-kind">Harcama yapılan</label>
        <input
          id="edit-expense-kind"
          className="input"
          value={expenseTitle}
          onChange={(e) => setExpenseTitle(e.target.value)}
          placeholder="Örn. mikrofon, kira, kırtasiye"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="label" htmlFor="edit-payee-id">
          Ödeme Yapılan Kişi yada Kurum / Tedarikçi / Harcamanın Adı
        </label>
        <input
          id="edit-payee-id"
          name="payeeIdentityNo"
          className="input"
          maxLength={200}
          defaultValue={entry.payeeIdentityNo ?? ""}
          placeholder="Örn. ABC Ltd. · muhasebe yazılımı aboneliği"
          autoComplete="off"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="label" htmlFor="edit-expense-requester">Talep eden</label>
        <input
          id="edit-expense-requester"
          className="input"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          placeholder="Ad soyad"
          required
          minLength={2}
        />
      </div>

      <ChannelFields
        idPrefix="edit-expense"
        defaultChannel={entry.channel ?? "CASH"}
        defaultBankName={entry.bankName ?? ""}
        defaultCheckInstallments={
          entry.checkInstallments != null ? String(entry.checkInstallments) : ""
        }
        bankAccounts={bankAccounts}
        expenseCards={expenseCards}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MoneyInput
          id="edit-expense-amount"
          name="amount"
          label="Tutar"
          defaultValue={entry.amount}
          required
        />
        <div>
          <label className="label" htmlFor="edit-expense-date">Tarih</label>
          <input
            id="edit-expense-date"
            name="occurredAt"
            type="date"
            className="input"
            defaultValue={toDateInputValue(entry.occurredAt)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="edit-invoice-no">Açıklama</label>
        <input
          id="edit-invoice-no"
          name="invoiceNo"
          className="input"
          defaultValue={entry.invoiceNo ?? ""}
          placeholder="Harcama açıklaması"
          required
          minLength={2}
        />
      </div>
    </ActionForm>
  );
}
