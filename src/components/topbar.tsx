"use client";

import { logoutAction } from "@/app/actions/auth";
import { ROLE_TR } from "@/lib/format";

export function Topbar({
  email,
  name,
  role,
  schoolName,
}: {
  email: string;
  name: string;
  role: string;
  schoolName: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <p className="truncate text-sm font-medium text-slate-700">{schoolName}</p>
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
