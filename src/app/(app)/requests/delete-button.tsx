"use client";

import { MiniForm } from "@/components/action-form";
import { deleteExpenseRequestAction } from "@/app/actions/expenses";

export function DeleteRequestButton({ id }: { id: string }) {
  return (
    <MiniForm
      action={async (fd) => {
        if (!window.confirm("Bu talebi silmek istediğinize emin misiniz?")) return;
        await deleteExpenseRequestAction(fd);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-red-600 hover:underline">
        Sil
      </button>
    </MiniForm>
  );
}
