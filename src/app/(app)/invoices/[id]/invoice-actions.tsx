"use client";

import { useActionState } from "react";
import { convertToEInvoiceAction, cancelInvoiceAction } from "@/app/actions/einvoice";
import { emptyState } from "@/app/actions/types";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function InvoiceActions({
  invoiceId,
  status,
  einvoiceProfile,
}: {
  invoiceId: string;
  status: string;
  einvoiceProfile: string;
}) {
  const [convState, convAction] = useActionState(convertToEInvoiceAction, emptyState);
  const [cancelState, cancelAction] = useActionState(cancelInvoiceAction, emptyState);

  const isCancelled = status === "CANCELLED";
  const alreadyEinvoice = einvoiceProfile !== "NONE";

  return (
    <div className="space-y-4">
      <FormSuccess message={convState.success ?? cancelState.success} />
      <FormError message={convState.error ?? cancelState.error} />

      <div className="flex flex-wrap gap-2">
        <a href={`/print/invoice/${invoiceId}`} target="_blank" rel="noreferrer" className="btn-secondary">
          Yazdır / PDF
        </a>
        <a href={`/api/invoices/${invoiceId}/ubl`} className="btn-secondary" download>
          UBL-TR XML indir
        </a>
      </div>

      {!isCancelled && (
        <form action={convAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="id" value={invoiceId} />
          <div>
            <label className="label" htmlFor="profile">E-Fatura profili</label>
            <select id="profile" name="profile" className="input !w-auto" defaultValue={alreadyEinvoice ? einvoiceProfile : "EARSIV"}>
              <option value="EARSIV">e-Arşiv Fatura</option>
              <option value="EFATURA">e-Fatura</option>
            </select>
          </div>
          <SubmitButton>{alreadyEinvoice ? "Yeniden gönder" : "E-Faturaya dönüştür"}</SubmitButton>
        </form>
      )}

      {!isCancelled && (
        <form
          action={cancelAction}
          onSubmit={(e) => {
            if (!confirm("Faturayı iptal etmek istediğinize emin misiniz? Ters muhasebe kaydı oluşturulacak.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={invoiceId} />
          <SubmitButton variant="danger">Faturayı iptal et</SubmitButton>
        </form>
      )}
    </div>
  );
}
