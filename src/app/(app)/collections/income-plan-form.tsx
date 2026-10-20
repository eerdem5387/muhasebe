"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import {
  createIncomePlanAction,
  createIncomePlanCategoryAction,
} from "@/app/actions/income-plans";
import { CHANNEL_TR, todayISO, fmtMoney } from "@/lib/format";
import { isEcommerceEligibleCategory, isEcomChannel, resolveEcomPlanRules } from "@/lib/ecommerce-channels";

export type PlanCategoryOption = {
  id: string;
  name: string;
  requiresStudent: boolean;
};

export type PlanStudentOption = {
  enrollmentId: string;
  fullName: string;
  classroom: string | null;
  academicYear: string;
  annualFee: number;
  paymentChannel: string;
  sourcePaymentPlan: string | null;
};

const BASE_CHANNELS = [
  { value: "CASH", label: "Nakit" },
  { value: "CREDIT_CARD", label: "Kredi kartı" },
  { value: "EFT", label: "EFT / Havale" },
  { value: "CHECK", label: "Çek" },
] as const;

const ECOM_CHANNEL_OPTIONS = [
  { value: "ECOM_ZIRAAT", label: "E-Ticaret Ziraat" },
  { value: "ECOM_ZIRAAT_2X", label: "E-Ticaret Ziraat 2 Taksit" },
  { value: "ECOM_OTHER_BANKS", label: "E-Ticaret Diğer Bankalar" },
] as const;

type PaymentSlice = {
  key: string;
  channel: string;
  amount: string;
  installmentCount: number;
  blockDays: number;
  bankName: string;
};

function newSlice(partial?: Partial<PaymentSlice>): PaymentSlice {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channel: "CASH",
    amount: "",
    installmentCount: 1,
    blockDays: 0,
    bankName: "",
    ...partial,
  };
}

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export function IncomePlanCreateModal({
  categories,
  students,
  canOverrideAmount,
}: {
  categories: PlanCategoryOption[];
  students: PlanStudentOption[];
  canOverrideAmount: boolean;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [studentQuery, setStudentQuery] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [payments, setPayments] = useState<PaymentSlice[]>(() => [
    newSlice({ channel: "CREDIT_CARD", installmentCount: 10, blockDays: 30 }),
  ]);

  const category = categories.find((c) => c.id === categoryId);
  const requiresStudent = Boolean(category?.requiresStudent);
  const ecomEligible = category ? isEcommerceEligibleCategory(category.name) && !requiresStudent : false;
  const selected = students.find((s) => s.enrollmentId === enrollmentId);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return students.slice(0, 40);
    return students
      .filter((s) =>
        [s.fullName, s.classroom ?? "", s.academicYear]
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(q),
      )
      .slice(0, 40);
  }, [students, studentQuery]);

  const lockedFee = selected?.annualFee ?? 0;
  const planTotal = requiresStudent
    ? canOverrideAmount
      ? parseAmount(targetAmount) || lockedFee
      : lockedFee
    : parseAmount(targetAmount);

  const paymentsSum = payments.reduce((s, p) => s + parseAmount(p.amount), 0);
  const remainder = Math.round((planTotal - paymentsSum) * 100) / 100;
  const sumMatches = planTotal > 0 && Math.abs(remainder) <= 0.05;

  useEffect(() => {
    if (!ecomEligible) {
      setPayments((rows) =>
        rows.map((r) =>
          isEcomChannel(r.channel)
            ? { ...r, channel: "CREDIT_CARD", installmentCount: 10, blockDays: 30, bankName: "" }
            : r,
        ),
      );
    }
  }, [categoryId, ecomEligible]);

  function updatePayment(key: string, patch: Partial<PaymentSlice>) {
    setPayments((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.channel && isEcomChannel(patch.channel)) {
          const rules = resolveEcomPlanRules(patch.channel);
          next.installmentCount = rules.installmentCount;
          next.blockDays = rules.blockDays;
          next.bankName = rules.bankName ?? "";
        }
        return next;
      }),
    );
  }

  function selectStudent(s: PlanStudentOption) {
    setEnrollmentId(s.enrollmentId);
    setStudentQuery(s.fullName);
    setTargetAmount(String(s.annualFee));
    const ch = ["CREDIT_CARD", "EFT", "CHECK", "CASH"].includes(s.paymentChannel)
      ? s.paymentChannel
      : "CREDIT_CARD";
    setPayments([
      newSlice({
        channel: ch,
        amount: String(s.annualFee),
        installmentCount: ch === "CASH" || ch === "EFT" ? 1 : 10,
        blockDays: ch === "CREDIT_CARD" ? 30 : 0,
      }),
    ]);
  }

  const paymentsJson = JSON.stringify(
    payments.map((p) => ({
      paymentChannel: p.channel,
      amount: p.amount,
      installmentCount: p.installmentCount,
      blockDays: p.blockDays,
      bankName: p.bankName || null,
    })),
  );

  const amountForSubmit = requiresStudent
    ? canOverrideAmount
      ? String(parseAmount(targetAmount) || lockedFee)
      : String(lockedFee)
    : String(parseAmount(targetAmount) || paymentsSum);

  return (
    <FormModal buttonLabel="Gelir planı ekle" title="Gelir planı oluştur" size="lg">
      <ActionForm action={createIncomePlanAction} submitLabel="Planı kaydet">
        <input type="hidden" name="paymentsJson" value={paymentsJson} />
        <input type="hidden" name="amount" value={amountForSubmit} />

        <div>
          <label className="label" htmlFor="categoryId">Gelir kalemi</label>
          <select
            id="categoryId"
            name="categoryId"
            className="input"
            required
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setEnrollmentId("");
              setStudentQuery("");
              setTargetAmount("");
              setPayments([newSlice({ channel: "CREDIT_CARD", installmentCount: 10, blockDays: 30 })]);
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {requiresStudent ? (
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
            <input type="hidden" name="enrollmentId" value={enrollmentId} />
            <div className="max-h-40 min-w-0 overflow-x-hidden overflow-y-auto rounded-lg border border-ink-200">
              {filteredStudents.map((s) => {
                const active = s.enrollmentId === enrollmentId;
                const channelLabel = CHANNEL_TR[s.paymentChannel] ?? s.paymentChannel;
                return (
                  <button
                    key={s.enrollmentId}
                    type="button"
                    className={`flex w-full min-w-0 items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      active ? "bg-brand-50 text-brand-800" : "text-ink-700"
                    }`}
                    onClick={() => selectStudent(s)}
                  >
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block truncate font-medium">
                        {s.fullName}
                        {s.classroom ? ` · ${s.classroom}` : ""}
                      </span>
                      <span className={`mt-0.5 block truncate text-xs ${active ? "text-brand-700" : "text-ink-500"}`}>
                        {channelLabel}
                        {s.sourcePaymentPlan ? ` · ${s.sourcePaymentPlan}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-xs font-medium sm:text-sm">
                      {fmtMoney(s.annualFee)}
                    </span>
                  </button>
                );
              })}
              {filteredStudents.length === 0 ? (
                <p className="px-3 py-2 text-sm text-ink-400">Öğrenci bulunamadı.</p>
              ) : null}
            </div>
            {selected ? (
              <p className="text-xs text-ink-500">
                Seçili: {selected.fullName} · sözleşme tutarı {fmtMoney(selected.annualFee)}
                {!canOverrideAmount ? " (değiştirilemez)" : ""}
              </p>
            ) : (
              <p className="text-xs text-amber-700">Öğrenci seçimi zorunlu.</p>
            )}
            {canOverrideAmount ? (
              <div>
                <label className="label" htmlFor="amount-override">Plan tutarı (süper admin)</label>
                <input
                  id="amount-override"
                  className="input"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="amount-override">Plan tutarı</label>
            <input
              id="amount-override"
              className="input"
              value={targetAmount}
              onChange={(e) => {
                const v = e.target.value;
                setTargetAmount(v);
                if (payments.length === 1) {
                  setPayments((rows) => rows.map((r, i) => (i === 0 ? { ...r, amount: v } : r)));
                }
              }}
              required
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="planDate">Plan tarihi</label>
          <input id="planDate" name="planDate" type="date" className="input" defaultValue={todayISO()} required />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Ödeme yöntemleri</p>
              <p className="text-xs text-ink-500">
                Örn. 50.000 nakit + kalanı kredi kartı.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary !py-1.5 text-xs sm:shrink-0"
              onClick={() =>
                setPayments((rows) => [
                  ...rows,
                  newSlice({
                    channel: "CREDIT_CARD",
                    amount: remainder > 0 ? String(remainder) : "",
                    installmentCount: 10,
                    blockDays: 30,
                  }),
                ])
              }
            >
              + Ödeme ekle
            </button>
          </div>

          {payments.map((pay, index) => {
            const ecomMode = ecomEligible && isEcomChannel(pay.channel);
            const ecomHint =
              pay.channel === "ECOM_ZIRAAT"
                ? "28 gün bloke · tutarın tamamı tek seferde planlanır."
                : pay.channel === "ECOM_ZIRAAT_2X"
                  ? "Tutar ikiye bölünür: yarısı +28 gün, diğer yarısı +56 gün."
                  : pay.channel === "ECOM_OTHER_BANKS"
                    ? "39 gün bloke · tutarın tamamı tek seferde planlanır."
                    : null;

            return (
              <div key={pay.key} className="min-w-0 space-y-3 rounded-xl border border-ink-200 bg-ink-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-800">Ödeme #{index + 1}</p>
                  {payments.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:underline"
                      onClick={() => setPayments((rows) => rows.filter((r) => r.key !== pay.key))}
                    >
                      Sil
                    </button>
                  ) : null}
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3">
                  <div className="min-w-0">
                    <label className="label" htmlFor={`ch-${pay.key}`}>Ödeme kanalı</label>
                    <select
                      id={`ch-${pay.key}`}
                      className="input"
                      value={pay.channel}
                      onChange={(e) => {
                        const channel = e.target.value;
                        const keepBank =
                          channel === "EFT" ||
                          channel === "CREDIT_CARD" ||
                          channel === "CHECK" ||
                          isEcomChannel(channel);
                        updatePayment(pay.key, {
                          channel,
                          bankName: keepBank ? pay.bankName : "",
                        });
                      }}
                    >
                      {BASE_CHANNELS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                      {ecomEligible
                        ? ECOM_CHANNEL_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))
                        : null}
                    </select>
                    {ecomHint ? <p className="mt-1 text-xs text-brand-700">{ecomHint}</p> : null}
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor={`amt-${pay.key}`}>Tutar</label>
                    <input
                      id={`amt-${pay.key}`}
                      className="input"
                      value={pay.amount}
                      onChange={(e) => updatePayment(pay.key, { amount: e.target.value })}
                      required
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="label" htmlFor={`inst-${pay.key}`}>Taksit sayısı</label>
                    <input
                      id={`inst-${pay.key}`}
                      type="number"
                      min={1}
                      max={48}
                      className="input"
                      value={pay.installmentCount}
                      onChange={(e) =>
                        updatePayment(pay.key, { installmentCount: Number(e.target.value) || 1 })
                      }
                      readOnly={ecomMode}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor={`blk-${pay.key}`}>Bloke (gün)</label>
                    <input
                      id={`blk-${pay.key}`}
                      type="number"
                      min={0}
                      max={365}
                      className="input"
                      value={pay.blockDays}
                      onChange={(e) =>
                        updatePayment(pay.key, { blockDays: Number(e.target.value) || 0 })
                      }
                      readOnly={ecomMode}
                    />
                  </div>
                </div>

                {pay.channel === "EFT" ? (
                  <div className="min-w-0">
                    <label className="label" htmlFor={`bank-${pay.key}`}>Hangi banka hesabına?</label>
                    <input
                      id={`bank-${pay.key}`}
                      className="input"
                      value={pay.bankName}
                      onChange={(e) => updatePayment(pay.key, { bankName: e.target.value })}
                      placeholder="Örn. Ziraat Bankası Vadeli hesap"
                      required
                      minLength={2}
                    />
                  </div>
                ) : null}

                {(pay.channel === "CREDIT_CARD" || pay.channel === "CHECK" || ecomMode) && (
                  <div className="min-w-0">
                    <label className="label" htmlFor={`bank-${pay.key}`}>
                      {ecomMode ? "Banka" : "Banka (opsiyonel)"}
                    </label>
                    <input
                      id={`bank-${pay.key}`}
                      className="input"
                      value={pay.bankName}
                      onChange={(e) => updatePayment(pay.key, { bankName: e.target.value })}
                      readOnly={ecomMode}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed sm:text-sm ${
              sumMatches
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                : "bg-amber-50 text-amber-900 ring-1 ring-amber-100"
            }`}
          >
            Plan tutarı {fmtMoney(planTotal || 0)} · Ödemeler {fmtMoney(paymentsSum)}
            {!sumMatches ? (
              <span>
                {" "}
                · Kalan {fmtMoney(remainder)} {remainder > 0 ? "(eksik)" : "(fazla)"}
              </span>
            ) : (
              <span> · Eşleşiyor</span>
            )}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">Not</label>
          <input id="notes" name="notes" className="input" />
        </div>
      </ActionForm>
    </FormModal>
  );
}

export function IncomeCategoryCreateModal() {
  return (
    <FormModal buttonLabel="Yeni gelir kalemi" title="Gelir kalemi ekle" buttonClassName="btn-secondary">
      <ActionForm action={createIncomePlanCategoryAction} submitLabel="Kaydet">
        <div>
          <label className="label" htmlFor="cat-name">Kalem adı</label>
          <input id="cat-name" name="name" className="input" required placeholder="Örn: Yemekhane geliri" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="requiresStudent" value="true" />
          Öğrenci seçimi zorunlu (sözleşme tutarı kilitli)
        </label>
      </ActionForm>
    </FormModal>
  );
}
