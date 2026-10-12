"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import {
  createIncomePlanAction,
  createIncomePlanCategoryAction,
} from "@/app/actions/income-plans";
import { CHANNEL_TR, todayISO, fmtMoney } from "@/lib/format";

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
  const [channel, setChannel] = useState("CREDIT_CARD");
  const [installments, setInstallments] = useState(10);

  const category = categories.find((c) => c.id === categoryId);
  const requiresStudent = Boolean(category?.requiresStudent);
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

  const lockedAmount = selected?.annualFee ?? 0;

  return (
    <FormModal buttonLabel="Gelir planı ekle" title="Gelir planı oluştur" size="lg">
      <ActionForm action={createIncomePlanAction} submitLabel="Planı kaydet">
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
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
              {filteredStudents.map((s) => {
                const active = s.enrollmentId === enrollmentId;
                const channelLabel = CHANNEL_TR[s.paymentChannel] ?? s.paymentChannel;
                return (
                  <button
                    key={s.enrollmentId}
                    type="button"
                    className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      active ? "bg-brand-50 text-brand-800" : "text-slate-700"
                    }`}
                    onClick={() => {
                      setEnrollmentId(s.enrollmentId);
                      setStudentQuery(s.fullName);
                      if (["CREDIT_CARD", "EFT", "CHECK", "CASH"].includes(s.paymentChannel)) {
                        setChannel(s.paymentChannel);
                      }
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {s.fullName}
                        {s.classroom ? ` · ${s.classroom}` : ""}
                      </span>
                      <span className={`mt-0.5 block text-xs ${active ? "text-brand-700" : "text-slate-500"}`}>
                        {channelLabel}
                        {s.sourcePaymentPlan ? ` · ${s.sourcePaymentPlan}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium">{fmtMoney(s.annualFee)}</span>
                  </button>
                );
              })}
              {filteredStudents.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">Öğrenci bulunamadı.</p>
              ) : null}
            </div>
            {selected ? (
              <p className="text-xs text-slate-500">
                Seçili: {selected.fullName} · sözleşme tutarı {fmtMoney(selected.annualFee)}
                {!canOverrideAmount ? " (değiştirilemez)" : ""}
              </p>
            ) : (
              <p className="text-xs text-amber-700">Öğrenci seçimi zorunlu.</p>
            )}
            {canOverrideAmount ? (
              <div>
                <label className="label" htmlFor="amount">Tutar (süper admin)</label>
                <input
                  id="amount"
                  name="amount"
                  className="input"
                  defaultValue={lockedAmount || ""}
                  key={enrollmentId || "amount"}
                  required
                />
              </div>
            ) : (
              <input type="hidden" name="amount" value={String(lockedAmount || "0")} />
            )}
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="amount">Tutar</label>
            <input id="amount" name="amount" className="input" required />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="planDate">Plan tarihi</label>
            <input id="planDate" name="planDate" type="date" className="input" defaultValue={todayISO()} required />
          </div>
          <div>
            <label className="label" htmlFor="paymentChannel">Ödeme kanalı</label>
            <select
              id="paymentChannel"
              name="paymentChannel"
              className="input"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="CREDIT_CARD">Kredi kartı</option>
              <option value="EFT">EFT / Havale</option>
              <option value="CHECK">Çek</option>
              <option value="CASH">Nakit</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="installmentCount">Taksit sayısı</label>
            <input
              id="installmentCount"
              name="installmentCount"
              type="number"
              min={1}
              max={48}
              className="input"
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value) || 1)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="blockDays">Bloke (gün)</label>
            <input id="blockDays" name="blockDays" type="number" min={0} max={365} className="input" defaultValue={channel === "CREDIT_CARD" ? 30 : 0} />
          </div>
          <div>
            <label className="label" htmlFor="bankName">Banka (opsiyonel)</label>
            <input id="bankName" name="bankName" className="input" />
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="requiresStudent" value="true" />
          Öğrenci seçimi zorunlu (sözleşme tutarı kilitli)
        </label>
      </ActionForm>
    </FormModal>
  );
}
