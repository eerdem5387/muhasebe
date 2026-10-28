"use client";

import { useState } from "react";
import { MoneyInput } from "@/components/money-input";

/** Checkbox: tutar önceden biliniyorsa MoneyInput gösterilir. */
export function RequestAmountFields() {
  const [amountKnown, setAmountKnown] = useState(false);

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          checked={amountKnown}
          onChange={(e) => setAmountKnown(e.target.checked)}
        />
        <span>Talep edilen harcama tutarı belirli mi?</span>
      </label>
      {amountKnown ? (
        <MoneyInput id="request-total" name="total" label="Tutar" required />
      ) : null}
    </div>
  );
}
