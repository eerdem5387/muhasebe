"use client";

import { reverseEntryAction } from "@/app/actions/journal";

export function ReverseEntryButton({ entryId }: { entryId: string }) {
  return (
    <form
      action={reverseEntryAction}
      onSubmit={(e) => {
        if (!confirm("Bu fişi ters kayıtla (storno) iptal etmek istiyor musunuz?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={entryId} />
      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
        İptal (storno)
      </button>
    </form>
  );
}
