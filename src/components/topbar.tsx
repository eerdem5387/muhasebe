"use client";

import { logoutAction, switchTenantAction } from "@/app/actions/auth";
import { ROLE_TR } from "@/lib/format";
import { MenuToggleButton } from "@/components/app-shell";

export function Topbar({
  email,
  name,
  role,
  schoolName,
  isSuperAdmin,
  memberships,
  activeTenantId,
}: {
  email: string;
  name: string;
  role: string;
  schoolName: string;
  isSuperAdmin?: boolean;
  memberships?: { tenantId: string; tenantName: string }[];
  activeTenantId?: string;
}) {
  const multi = (memberships?.length ?? 0) > 1 || isSuperAdmin;

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MenuToggleButton />
        {multi && memberships && memberships.length > 0 ? (
          <form action={switchTenantAction}>
            <label className="sr-only" htmlFor="tenantId">Okul / şirket</label>
            <select
              id="tenantId"
              name="tenantId"
              defaultValue={activeTenantId}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="input !w-auto max-w-[16rem] truncate !py-1.5 text-sm"
            >
              {memberships.map((m) => (
                <option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>
              ))}
            </select>
          </form>
        ) : (
          <p className="truncate text-sm font-medium text-slate-700">{schoolName}</p>
        )}
        {isSuperAdmin ? (
          <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 sm:inline">
            Süper Admin
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-700">{name || email}</p>
          <p className="text-xs text-slate-400">{ROLE_TR[role] ?? role}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary !py-1.5 text-sm">Çıkış</button>
        </form>
      </div>
    </header>
  );
}
