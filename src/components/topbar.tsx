"use client";

import { logoutAction, switchCompanyAction, switchTenantAction } from "@/app/actions/auth";

interface Option {
  id: string;
  label: string;
}

export function Topbar({
  email,
  role,
  tenants,
  activeTenantId,
  companies,
  activeCompanyId,
}: {
  email: string;
  role: string;
  tenants: Option[];
  activeTenantId: string;
  companies: Option[];
  activeCompanyId: string | null;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <form action={switchTenantAction}>
          <label className="sr-only" htmlFor="tenantId">Organizasyon</label>
          <select
            id="tenantId"
            name="tenantId"
            defaultValue={activeTenantId}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="input !w-auto min-w-[10rem] !py-1.5 text-sm"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </form>

        {companies.length > 0 ? (
          <form action={switchCompanyAction} className="flex items-center gap-2">
            <span className="text-slate-300">/</span>
            <label className="sr-only" htmlFor="companyId">Şirket</label>
            <select
              id="companyId"
              name="companyId"
              defaultValue={activeCompanyId ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="input !w-auto min-w-[12rem] !py-1.5 text-sm"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </form>
        ) : (
          <span className="text-sm text-amber-600">Henüz şirket yok</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-700">{email}</p>
          <p className="text-xs text-slate-400">{role}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary !py-1.5 text-sm">Çıkış</button>
        </form>
      </div>
    </header>
  );
}
