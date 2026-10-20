"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + delta);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}

function formatTr(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export function RequestDateFilter({
  date,
  today,
}: {
  date: string | null;
  today: string;
}) {
  const router = useRouter();
  const active = date ?? today;
  const filtered = Boolean(date);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gün</span>
      {filtered ? (
        <>
          <Link href={`/requests?date=${shiftDay(active, -1)}`} className="btn-secondary !px-2.5 !py-1 text-xs">
            ‹
          </Link>
          <input
            type="date"
            className="input !w-auto !py-1 text-sm"
            value={active}
            onChange={(e) => {
              const v = e.target.value;
              router.push(v ? `/requests?date=${v}` : "/requests");
            }}
          />
          <Link href={`/requests?date=${shiftDay(active, 1)}`} className="btn-secondary !px-2.5 !py-1 text-xs">
            ›
          </Link>
          <span className="hidden text-sm text-slate-600 sm:inline">{formatTr(active)}</span>
          <Link href="/requests" className="ml-auto text-xs font-medium text-brand-700 hover:underline">
            Tüm günler
          </Link>
        </>
      ) : (
        <>
          <span className="text-sm text-slate-600">Tüm talepler</span>
          <Link href={`/requests?date=${today}`} className="ml-auto btn-secondary !py-1 text-xs">
            Bugüne filtrele
          </Link>
          <input
            type="date"
            className="input !w-auto !py-1 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) router.push(`/requests?date=${e.target.value}`);
            }}
            aria-label="Gün seç"
          />
        </>
      )}
    </div>
  );
}
