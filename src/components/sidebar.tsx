"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSidebarUi } from "@/components/app-shell";

const NAV = [
  { href: "/", label: "Panel", group: "Genel" },
  { href: "/monthly", label: "Aylık gelir-gider", group: "Genel" },
  { href: "/students", label: "Öğrenciler / Kayıtlar", group: "Tahsilat" },
  { href: "/collections", label: "Tahsilatlar", group: "Tahsilat" },
  { href: "/income", label: "Gelir planı", group: "Tahsilat" },
  { href: "/expenses", label: "Giderler", group: "Harcama" },
  { href: "/requests", label: "Harcama talepleri", group: "Harcama" },
  { href: "/settings", label: "Ayarlar", group: "Yönetim" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebarUi();
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/30 print:hidden lg:hidden"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar"
        className={clsx(
          "z-40 shrink-0 border-r border-slate-200 bg-white print:hidden",
          open
            ? "fixed inset-y-0 left-0 w-64 lg:static lg:block"
            : "hidden",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            O
          </div>
          <span className="text-lg font-semibold text-slate-800">Okul Muhasebe</span>
        </div>
        <nav className="space-y-6 p-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group}
              </p>
              <div className="space-y-1">
                {NAV.filter((n) => n.group === group).map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
                      }}
                      className={clsx(
                        "block rounded-lg px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
