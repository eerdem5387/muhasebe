"use client";

import Link from "next/link";
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
  awaitingAmountCount = 0,
}: {
  email: string;
  name: string;
  role: string;
  schoolName: string;
  isSuperAdmin?: boolean;
  memberships?: { tenantId: string; tenantName: string }[];
  activeTenantId?: string;
  /** Kurucu onaylı, muhasebe tutarı bekleyen talep sayısı */
  awaitingAmountCount?: number;
}) {
  const multi = (memberships?.length ?? 0) > 1 || isSuperAdmin;
  const initials = (name || email || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-20 flex h-[4.25rem] items-center gap-3 border-b border-ink-200/80 bg-white/85 px-4 backdrop-blur-md lg:gap-4 lg:px-8">
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <MenuToggleButton className="btn-secondary !gap-1.5 !px-2.5 !py-2 print:hidden" />
        {multi && memberships && memberships.length > 0 ? (
          <form action={switchTenantAction}>
            <label className="sr-only" htmlFor="tenantId">
              Okul / şirket
            </label>
            <select
              id="tenantId"
              name="tenantId"
              defaultValue={activeTenantId}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="input !w-auto max-w-[14rem] truncate !py-2 text-sm font-medium"
            >
              {memberships.map((m) => (
                <option key={m.tenantId} value={m.tenantId}>
                  {m.tenantName}
                </option>
              ))}
            </select>
          </form>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{schoolName}</p>
            <p className="hidden text-xs text-ink-400 sm:block">Muhasebe paneli</p>
          </div>
        )}
        {isSuperAdmin ? (
          <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/80 md:inline">
            Süper Admin
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 justify-center px-1">
        {awaitingAmountCount > 0 ? (
          <Link
            href="/requests"
            className="inline-flex max-w-full items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-200/90 transition hover:bg-amber-100 sm:text-sm"
            title="Onaylanmış talepler için tutar girin"
          >
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white"
              aria-hidden
            >
              {awaitingAmountCount > 99 ? "99+" : awaitingAmountCount}
            </span>
            <span className="truncate">
              <span className="sm:hidden">Tutar bekleyen talep</span>
              <span className="hidden sm:inline">
                {awaitingAmountCount === 1
                  ? "1 onaylı talep tutar bekliyor — girmek için tıklayın"
                  : `${awaitingAmountCount} onaylı talep tutar bekliyor — girmek için tıklayın`}
              </span>
            </span>
          </Link>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-3 sm:flex">
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-800">{name || email}</p>
            <p className="text-xs text-ink-400">{ROLE_TR[role] ?? role}</p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm"
            aria-hidden
          >
            {initials || "?"}
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary !py-2 text-sm">
            Çıkış
          </button>
        </form>
      </div>
    </header>
  );
}
