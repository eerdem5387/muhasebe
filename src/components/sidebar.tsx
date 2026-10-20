"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSidebarUi } from "@/components/app-shell";

const NAV = [
  { href: "/", label: "Panel", group: "Genel", icon: "grid" },
  { href: "/monthly", label: "Aylık gelir-gider", group: "Genel", icon: "table" },
  { href: "/planned-income", label: "Planlanmış gelirler", group: "Genel", icon: "calendar" },
  { href: "/students", label: "Öğrenciler / Kayıtlar", group: "Tahsilat", icon: "users" },
  { href: "/collections", label: "Gelir planı", group: "Tahsilat", icon: "plan" },
  { href: "/requests", label: "Harcama talepleri", group: "Harcama", icon: "receipt" },
  { href: "/settings", label: "Ayarlar", group: "Yönetim", icon: "settings", settingsOnly: true },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = "h-4 w-4 shrink-0 opacity-90";
  switch (name) {
    case "grid":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "table":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      );
    case "users":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "plan":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "receipt":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
  }
}

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
          className="fixed inset-0 z-30 bg-ink-950/40 backdrop-blur-[2px] print:hidden lg:hidden"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar"
        className={clsx(
          "z-40 flex shrink-0 flex-col border-r border-ink-200/80 bg-white/90 backdrop-blur-md print:hidden",
          open ? "fixed inset-y-0 left-0 w-[17rem] lg:static lg:flex" : "hidden",
        )}
      >
        <div className="flex h-[4.25rem] items-center border-b border-ink-100 px-5">
          <Link
            href="/"
            className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            onClick={() => {
              if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                setOpen(false);
              }
            }}
          >
            <Image
              src="/logo.png"
              alt="Levent Koleji"
              width={168}
              height={42}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-4" aria-label="Ana menü">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                {group}
              </p>
              <div className="space-y-1">
                {items
                  .filter((n) => n.group === group)
                  .map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
                        }}
                        className={clsx("nav-link", active ? "nav-link-active" : "nav-link-idle")}
                        aria-current={active ? "page" : undefined}
                      >
                        <NavIcon name={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-ink-100 px-5 py-4">
          <p className="text-[11px] font-medium text-ink-400">Levent Koleji Muhasebe</p>
        </div>
      </aside>
    </>
  );
}
