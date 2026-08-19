"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { MiniForm } from "@/components/action-form";
import { createReportEntryAction, deleteReportGroupAction, deleteReportItemAction } from "@/app/actions/report";
import { todayISO } from "@/lib/format";

export type GroupOption = {
  id: string;
  name: string;
  items: { id: string; name: string }[];
};

export function ReportEntryModal({
  side,
  month,
  groups,
}: {
  side: "INCOME" | "EXPENSE";
  month: string;
  groups: GroupOption[];
}) {
  const [groupId, setGroupId] = useState("");
  const [itemId, setItemId] = useState("");
  const items = useMemo(
    () => groups.find((g) => g.id === groupId)?.items ?? [],
    [groups, groupId],
  );
  const isIncome = side === "INCOME";
  const defaultDay = `${month}-01`;

  return (
    <FormModal
      buttonLabel={isIncome ? "Gelir ekle" : "Gider ekle"}
      title={isIncome ? "Gelir ekle" : "Gider ekle"}
      buttonClassName="btn-secondary !py-1.5 text-xs"
    >
      <ActionForm action={createReportEntryAction} submitLabel="Kaydet">
        <input type="hidden" name="side" value={side} />
        <input type="hidden" name="yearMonth" value={month} />
        <div>
          <label className="label" htmlFor={`${side}-group`}>Ana kalem</label>
          <select
            id={`${side}-group`}
            name="groupId"
            className="input"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setItemId("");
            }}
          >
            <option value="">Yeni ana kalem yazacağım</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        {!groupId && (
          <div>
            <label className="label" htmlFor={`${side}-groupName`}>Yeni ana kalem adı</label>
            <input id={`${side}-groupName`} name="groupName" className="input" placeholder="Örn: Diğer giderler" />
          </div>
        )}
        <div>
          <label className="label" htmlFor={`${side}-item`}>Alt kalem</label>
          <select
            id={`${side}-item`}
            name="itemId"
            className="input"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            disabled={!groupId}
          >
            <option value="">Yeni alt kalem yazacağım</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </select>
        </div>
        {!itemId && (
          <div>
            <label className="label" htmlFor={`${side}-itemName`}>Yeni alt kalem adı</label>
            <input id={`${side}-itemName`} name="itemName" className="input" placeholder={isIncome ? "Örn: Çek" : "Örn: Elektrik"} />
          </div>
        )}
        <div>
          <label className="label" htmlFor={`${side}-amount`}>Tutar</label>
          <input id={`${side}-amount`} name="amount" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor={`${side}-date`}>Tarih</label>
          <input id={`${side}-date`} name="occurredAt" type="date" className="input" defaultValue={todayISO().startsWith(month) ? todayISO() : defaultDay} required />
        </div>
        {isIncome ? (
          <input type="hidden" name="payKind" value="CASH" />
        ) : (
          <div>
            <label className="label" htmlFor={`${side}-kind`}>Ödeme türü</label>
            <select id={`${side}-kind`} name="payKind" className="input" defaultValue="CASH">
              <option value="CASH">Nakit</option>
              <option value="CARD">Kredi kartı</option>
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor={`${side}-notes`}>Not (opsiyonel)</label>
          <input id={`${side}-notes`} name="notes" className="input" />
        </div>
      </ActionForm>
    </FormModal>
  );
}

export function ReportStructureModal({
  side,
  month,
  groups,
}: {
  side: "INCOME" | "EXPENSE";
  month: string;
  groups: GroupOption[];
}) {
  return (
    <FormModal
      buttonLabel="Kalemleri düzenle"
      title={side === "INCOME" ? "Gelir kalemleri" : "Gider kalemleri"}
      buttonClassName="text-xs font-medium text-slate-500 underline hover:text-slate-800 !border-0 !bg-transparent !px-1 !py-1 !shadow-none"
    >
      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">Henüz kalem yok. Önce gelir/gider eklerken ana ve alt kalem oluşturun.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-800">{g.name}</p>
                <MiniForm action={deleteReportGroupAction}>
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="yearMonth" value={month} />
                  <button className="text-xs text-red-600">Ana kalemi sil</button>
                </MiniForm>
              </div>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between text-sm">
                    <span>{it.name}</span>
                    <MiniForm action={deleteReportItemAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="yearMonth" value={month} />
                      <button className="text-xs text-red-600">Sil</button>
                    </MiniForm>
                  </li>
                ))}
                {g.items.length === 0 && <li className="text-xs text-slate-400">Alt kalem yok.</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </FormModal>
  );
}
