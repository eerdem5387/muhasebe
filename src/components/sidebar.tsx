"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface NavItem {
  href: string;
  label: string;
  group: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Panel", group: "Genel" },
  { href: "/invoices", label: "Faturalar", group: "Ticari" },
  { href: "/expenses", label: "Gelir / Gider Fişleri", group: "Ticari" },
  { href: "/transfers", label: "Şirketler Arası Transfer", group: "Ticari" },
  { href: "/journal", label: "Yevmiye (T-Cetveli)", group: "Muhasebe" },
  { href: "/accounts", label: "Hesap Planı", group: "Muhasebe" },
  { href: "/reports/statement", label: "Cari Ekstre", group: "Raporlar" },
  { href: "/reports/trial-balance", label: "Mizan", group: "Raporlar" },
  { href: "/reports/vat", label: "KDV Beyanı", group: "Raporlar" },
  { href: "/reports/income-statement", label: "Gelir Tablosu", group: "Raporlar" },
  { href: "/reports/balance-sheet", label: "Bilanço", group: "Raporlar" },
  { href: "/reports/aging", label: "Cari Yaşlandırma", group: "Raporlar" },
  { href: "/contacts", label: "Cariler / CRM", group: "Kartlar" },
  { href: "/products", label: "Ürün & Hizmet", group: "Kartlar" },
  { href: "/taxes", label: "Vergiler", group: "Kartlar" },
  { href: "/companies", label: "Şirketler", group: "Ayarlar" },
];

export function Sidebar() {
  const pathname = usePathname();
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          M
        </div>
        <span className="text-lg font-semibold text-slate-800">Muhasebe</span>
      </div>
      <nav className="space-y-6 p-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group}
            </p>
            <div className="space-y-1">
              {NAV.filter((n) => n.group === group).map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
  );
}
