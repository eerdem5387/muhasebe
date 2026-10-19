"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSidebarUi } from "@/components/app-shell";

const NAV = [
  { href: "/", label: "Panel", group: "Genel" },
  { href: "/monthly", label: "Aylık gelir-gider", group: "Genel" },
  { href: "/planned-income", label: "Planlanmış gelirler", group: "Genel" },
  { href: "/students", label: "Öğrenciler / Kayıtlar", group: "Tahsilat" },
  { href: "/collections", label: "Gelir planı", group: "Tahsilat" },
  { href: "/requests", label: "Harcama talepleri", group: "Harcama" },
  { href: "/settings", label: "Ayarlar", group: "Yönetim", settingsOnly: true },
];

export function Sidebar({ showSettings = false }: { showSettings?: boolean }) {
  const pathname = usePathname();
  const { open, setOpen } = useSidebarUi();
  const items = NAV.filter((n) => !("settingsOnly" in n && n.settingsOnly) || showSettings);
  const groups = [...new Set(items.map((n) => n.group))];

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
          open ? "fixed inset-y-0 left-0 w-64 lg:static lg:block" : "hidden",
        )}
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-4">
          <Link href="/" className="flex items-center" onClick={() => {
            if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
              setOpen(false);
            }
          }}>
            <Image
              src="/logo.png"
              alt="Levent Koleji"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <nav className="space-y-6 p-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group}
              </p>
              <div className="space-y-1">
                {items.filter((n) => n.group === group).map((item) => {
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
