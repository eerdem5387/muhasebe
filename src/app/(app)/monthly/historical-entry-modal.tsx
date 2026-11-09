"use client";

import { useState } from "react";
import { FormModal } from "@/components/form-modal";
import { todayISO } from "@/lib/format";
import {
  CashbookExpenseForm,
  CashbookIncomeForm,
  type CashbookStudentOption,
  type NamedAccountOption,
} from "./entry-form";

type Side = "INCOME" | "EXPENSE";

/** Başlık altındaki geçmiş tarihli gelir/gider giriş kapısı. */
export function HistoricalCashbookModal({
  students,
  bankAccounts = [],
  cardBanks = [],
}: {
  students: CashbookStudentOption[];
  bankAccounts?: NamedAccountOption[];
  cardBanks?: NamedAccountOption[];
}) {
  const [side, setSide] = useState<Side>("INCOME");
  const defaultDay = todayISO();

  return (
    <FormModal
      buttonLabel="Geçmiş tarihli gelir / gider ekle"
      title="Geçmiş tarihli kayıt"
      buttonClassName="btn-primary !py-2 text-sm"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-600">
          Geçmiş bir işlem tarihi seçin; kayıt otomatik olarak o aya işlenir. Form, mevcut gelir/gider
          ekleme alanlarıyla aynıdır.
        </p>

        <div className="flex gap-2 rounded-xl bg-ink-50 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              side === "INCOME"
                ? "bg-white text-ink-950 shadow-sm ring-1 ring-ink-200/80"
                : "text-ink-500 hover:text-ink-800"
            }`}
            onClick={() => setSide("INCOME")}
          >
            Gelir
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              side === "EXPENSE"
                ? "bg-white text-ink-950 shadow-sm ring-1 ring-ink-200/80"
                : "text-ink-500 hover:text-ink-800"
            }`}
            onClick={() => setSide("EXPENSE")}
          >
            Gider
          </button>
        </div>

        {side === "INCOME" ? (
          <CashbookIncomeForm
            key="hist-income"
            students={students}
            defaultDay={defaultDay}
            idPrefix="hist-income"
            submitLabel="Geçmiş geliri kaydet"
            bankAccounts={bankAccounts}
            cardBanks={cardBanks}
          />
        ) : (
          <CashbookExpenseForm
            key="hist-expense"
            defaultDay={defaultDay}
            idPrefix="hist-expense"
            submitLabel="Geçmiş gideri kaydet"
            bankAccounts={bankAccounts}
            cardBanks={cardBanks}
          />
        )}
      </div>
    </FormModal>
  );
}
