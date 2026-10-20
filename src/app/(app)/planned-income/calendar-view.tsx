"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Badge } from "@/components/ui";
import { fmtMoney, fmtMonth, shiftYearMonth, todayISO } from "@/lib/format";
import type { PlannedIncomeEvent } from "@/server/planned-income";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function buildMonthCells(yearMonth: string): Array<{ date: string | null; day: number | null }> {
  const [y, m] = yearMonth.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  // JS: 0=Sun … convert to Mon-first (0=Mon)
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
  const z = (n: number) => String(n).padStart(2, "0");
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${y}-${z(m)}-${z(d)}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

export function PlannedIncomeCalendar({
  month,
  events,
}: {
  month: string;
  events: PlannedIncomeEvent[];
}) {
  const today = todayISO();
  const byDate = useMemo(() => {
    const map = new Map<string, PlannedIncomeEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const defaultDay =
    byDate.get(today)?.length
      ? today
      : events[0]?.date ?? (month === today.slice(0, 7) ? today : `${month}-01`);

  const [selected, setSelected] = useState(defaultDay);
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const dayEvents = byDate.get(selected) ?? [];
  const plannedSum = events.filter((e) => e.status === "PLANNED").reduce((s, e) => s + e.amount, 0);
  const creditedSum = events.filter((e) => e.status === "CREDITED").reduce((s, e) => s + e.amount, 0);
  const prev = shiftYearMonth(month, -1);
  const next = shiftYearMonth(month, 1);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3.5">
          <Link
            href={`/planned-income?month=${prev}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-ink-600 transition hover:bg-ink-100"
            aria-label="Önceki ay"
          >
            ‹
          </Link>
          <div className="text-center">
            <p className="text-base font-semibold capitalize tracking-tight text-ink-950">{fmtMonth(month)}</p>
            <p className="text-xs text-ink-500">
              {events.length} kalem · Plan {fmtMoney(plannedSum)} · Geçen {fmtMoney(creditedSum)}
            </p>
          </div>
          <Link
            href={`/planned-income?month=${next}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-ink-600 transition hover:bg-ink-100"
            aria-label="Sonraki ay"
          >
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 border-b border-ink-100 px-2 pt-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 px-2 pb-3 pt-1">
          {cells.map((cell, idx) => {
            if (!cell.date || cell.day == null) {
              return <div key={`empty-${idx}`} className="h-12" />;
            }
            const dayList = byDate.get(cell.date) ?? [];
            const isSelected = selected === cell.date;
            const isToday = cell.date === today;
            const hasPlanned = dayList.some((e) => e.status === "PLANNED");
            const hasCredited = dayList.some((e) => e.status === "CREDITED");

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(cell.date!)}
                className={clsx(
                  "flex h-12 flex-col items-center justify-start rounded-xl pt-1.5 transition",
                  isSelected ? "bg-brand-600 text-white shadow-sm" : "text-ink-800 hover:bg-ink-50",
                )}
              >
                <span
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    isToday && !isSelected && "bg-brand-100 text-brand-800",
                  )}
                >
                  {cell.day}
                </span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {hasPlanned ? (
                    <span className={clsx("h-1.5 w-1.5 rounded-full", isSelected ? "bg-amber-200" : "bg-amber-500")} />
                  ) : null}
                  {hasCredited ? (
                    <span className={clsx("h-1.5 w-1.5 rounded-full", isSelected ? "bg-emerald-200" : "bg-emerald-500")} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Seçili gün</p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-ink-950">
            {new Intl.DateTimeFormat("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(`${selected}T12:00:00`))}
          </h2>
        </div>

        {dayEvents.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-400">Bu gün planlanmış gelir yok.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {dayEvents.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-ink-900">{e.title}</p>
                      <Badge color={e.status === "CREDITED" ? "green" : "amber"}>
                        {e.status === "CREDITED" ? "Hesaba geçti" : "Planlanmış"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {e.source} · {e.channel}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">{fmtMoney(e.amount)}</p>
                </div>
                {e.href ? (
                  <Link href={e.href} className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline">
                    Detaya git →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Planlanmış
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hesaba geçti
        </span>
      </div>
    </div>
  );
}
