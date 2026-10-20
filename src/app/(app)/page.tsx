import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { fmtMoney, toYearMonth } from "@/lib/format";
import { scheduleStatus } from "@/server/income-schedule";
import Link from "next/link";

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const ym = toYearMonth(new Date());

  const [lines, cashbookExpenses, pending, students, collections] = await Promise.all([
    ctx.db.incomeScheduleLine.findMany({
      where: { yearMonth: ym, enrollment: { status: "ACTIVE" } },
      include: { enrollment: { include: { collections: { select: { id: true } } } } },
    }),
    ctx.db.cashbookEntry.findMany({
      where: { yearMonth: ym, side: "EXPENSE" },
      select: { amount: true },
    }),
    ctx.db.expenseRequest.count({ where: { status: "PENDING" } }),
    ctx.db.student.count(),
    ctx.db.collection.findMany({ select: { enrollmentId: true } }),
  ]);

  let blocked = 0,
    expected = 0,
    realized = 0;
  for (const line of lines) {
    const status = scheduleStatus(line.releaseDate, line.enrollment.collections.length > 0);
    const n = Number(line.amount);
    if (status === "BLOCKED") blocked += n;
    else if (status === "EXPECTED") expected += n;
    else realized += n;
  }
  const expenseTotal = cashbookExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const collectedEnrollments = new Set(collections.map((c) => c.enrollmentId)).size;
  const enrollmentCount = await ctx.db.enrollment.count({ where: { status: "ACTIVE" } });
  const collectionRate = enrollmentCount ? Math.round((collectedEnrollments / enrollmentCount) * 100) : 0;

  const cards: {
    label: string;
    value: string;
    href?: string;
    tone: "income" | "pending" | "expense" | "info" | "alert" | "neutral";
  }[] = [
    { label: "Bu ay gerçekleşen gelir", value: fmtMoney(realized), tone: "income" },
    { label: "Bu ay beklenen", value: fmtMoney(expected), tone: "pending" },
    { label: "Bu ay blokeli", value: fmtMoney(blocked), tone: "alert" },
    { label: "Bu ay gider", value: fmtMoney(expenseTotal), href: "/monthly", tone: "expense" },
    { label: "Bekleyen talep", value: String(pending), href: "/requests", tone: "alert" },
    { label: "Tahsilat oranı", value: `%${collectionRate}`, tone: "info" },
    { label: "Öğrenci", value: String(students), href: "/students", tone: "neutral" },
  ];

  const accent: Record<(typeof cards)[number]["tone"], string> = {
    income: "from-emerald-500/15 to-transparent",
    pending: "from-brand-500/15 to-transparent",
    expense: "from-rose-500/12 to-transparent",
    info: "from-sky-500/12 to-transparent",
    alert: "from-amber-500/15 to-transparent",
    neutral: "from-ink-400/10 to-transparent",
  };

  const valueColor: Record<(typeof cards)[number]["tone"], string> = {
    income: "text-emerald-800",
    pending: "text-brand-800",
    expense: "text-rose-800",
    info: "text-sky-900",
    alert: "text-amber-900",
    neutral: "text-ink-900",
  };

  return (
    <div>
      <PageHeader
        title="Panel"
        description={`${ctx.tenantName} · bu ayın nakit özeti`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <div
              className={`card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lift ${
                c.href ? "cursor-pointer" : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accent[c.tone]}`}
                aria-hidden
              />
              <p className="relative text-sm font-medium text-ink-500">{c.label}</p>
              <p className={`relative mt-2 text-2xl font-bold tracking-tight ${valueColor[c.tone]}`}>
                {c.value}
              </p>
              {c.href ? (
                <p className="relative mt-3 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
                  Detaya git →
                </p>
              ) : (
                <div className="mt-3 h-4" aria-hidden />
              )}
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-2xl">
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
