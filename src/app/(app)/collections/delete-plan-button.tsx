"use client";

import { useRouter } from "next/navigation";
import { MiniForm } from "@/components/action-form";
import { deleteIncomePlanAction } from "@/app/actions/income-plans";

export function DeletePlanButton({
  planId,
  label = "Planı sil",
}: {
  planId: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <MiniForm
      action={async (fd) => {
        if (
          !window.confirm(
            "Bu gelir planının tüm taksit satırları silinecek. Devam edilsin mi?",
          )
        ) {
          return;
        }
        await deleteIncomePlanAction(fd);
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={planId} />
      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
        {label}
      </button>
    </MiniForm>
  );
}
