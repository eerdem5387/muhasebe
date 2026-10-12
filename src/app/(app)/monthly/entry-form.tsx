"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { createCashbookExpenseAction, createCashbookIncomeAction } from "@/app/actions/cashbook";
import { todayISO } from "@/lib/format";

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
          <option value="CASH">Nakit</option>
          <option value="CREDIT_CARD">Kredi kartı</option>
          <option value="CHECK">Çek</option>
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

export function IncomeAddModal({ month }: { month: string }) {
  const defaultDay = todayISO().startsWith(month) ? todayISO() : `${month}-01`;

  return (
    <FormModal buttonLabel="Gelir ekle" title="Gelir ekle" buttonClassName="btn-secondary !py-1.5 text-xs" size="lg">
      <ActionForm action={createCashbookIncomeAction} submitLabel="Kaydet">
        <input type="hidden" name="yearMonth" value={month} />
        <div>
          <label className="label" htmlFor="income-category">Gelir kalemi</label>
          <select id="income-category" name="incomeCategory" className="input" required defaultValue="STUDENT">
            <option value="STUDENT">Öğrenci</option>
            <option value="TRIP">Gezi</option>
            <option value="FOOD">Yemek</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>
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
        <div>
          <label className="label" htmlFor="payer-tc">TC kimlik</label>
          <input id="payer-tc" name="payerIdentityNo" className="input" inputMode="numeric" maxLength={11} required />
        </div>
        <ChannelFields idPrefix="income" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="income-amount">Tutar</label>
            <input id="income-amount" name="amount" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="income-date">Tarih</label>
            <input id="income-date" name="occurredAt" type="date" className="input" defaultValue={defaultDay} required />
          </div>
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
          <label className="label" htmlFor="expense-title">Harcama yapılan adı</label>
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
