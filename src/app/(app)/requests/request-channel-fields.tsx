"use client";

import { useState } from "react";

export type NamedOption = { id: string; name: string };

/** Harcama talebi: kanal + banka hesabı / harcama kartı seçimi. */
export function RequestChannelFields({
  bankAccounts,
  expenseCards,
}: {
  bankAccounts: NamedOption[];
  expenseCards: NamedOption[];
}) {
  const [channel, setChannel] = useState("BANK");
  const needsBank = channel === "BANK" || channel === "CHECK";
  const needsCard = channel === "CREDIT_CARD";
  const options = needsCard ? expenseCards : needsBank ? bankAccounts : [];
  const label = needsCard
    ? "Kredi kartı"
    : channel === "CHECK"
      ? "Çek bankası / hesap"
      : "Banka hesabı";
  const emptyHint = needsCard
    ? "Ayarlar’dan harcama kredi kartı ekleyin."
    : "Ayarlar’dan banka hesabı ekleyin.";

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="channel">Harcama kanalı</label>
        <select
          id="channel"
          name="channel"
          className="input"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          required
        >
          <option value="BANK">Banka</option>
          <option value="CHECK">Çek</option>
          <option value="CREDIT_CARD">Kredi kartı</option>
          <option value="CASH">Nakit</option>
          <option value="PROMISSORY">Senet</option>
        </select>
      </div>

      {needsBank || needsCard ? (
        <div className="space-y-1.5">
          <label className="label" htmlFor="request-bankName">{label}</label>
          <select id="request-bankName" name="bankName" className="input" required defaultValue="">
            <option value="" disabled>
              Seçin…
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
          {options.length === 0 ? (
            <p className="text-xs text-amber-700">{emptyHint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
