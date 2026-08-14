import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { fmtMoney, toYearMonth } from "@/lib/format";
import { scheduleStatus } from "@/server/income-schedule";
import Link from "next/link";

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const ym = toYearMonth(new Date());
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [lines, expenses, pending, students, collections] = await Promise.all([
    ctx.db.incomeScheduleLine.findMany({
      where: { yearMonth: ym, enrollment: { status: "ACTIVE" } },
      include: { enrollment: { include: { collections: { select: { id: true } } } } },
    }),
    ctx.db.expense.findMany({
      where: { spentAt: { gte: monthStart, lt: monthEnd } },
    }),
    ctx.db.expenseRequest.count({ where: { status: "PENDING" } }),
    ctx.db.student.count(),
    ctx.db.collection.findMany({ select: { enrollmentId: true } }),
  ]);

  let blocked = 0, expected = 0, realized = 0;
  for (const line of lines) {
    const status = scheduleStatus(line.releaseDate, line.enrollment.collections.length > 0);
    const n = Number(line.amount);
    if (status === "BLOCKED") blocked += n;
    else if (status === "EXPECTED") expected += n;
    else realized += n;
  }
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const collectedEnrollments = new Set(collections.map((c) => c.enrollmentId)).size;
  const enrollmentCount = await ctx.db.enrollment.count({ where: { status: "ACTIVE" } });
  const collectionRate = enrollmentCount ? Math.round((collectedEnrollments / enrollmentCount) * 100) : 0;

  const cards = [
    { label: "Bu ay gerçekleşen gelir", value: fmtMoney(realized) },
    { label: "Bu ay beklenen", value: fmtMoney(expected) },
    { label: "Bu ay blokeli", value: fmtMoney(blocked) },
    { label: "Bu ay gider", value: fmtMoney(expenseTotal) },
    { label: "Bekleyen talep", value: String(pending), href: "/requests" },
    { label: "Tahsilat oranı", value: `%${collectionRate}` },
    { label: "Öğrenci", value: String(students), href: "/students" },
  ];

  return (
    <div>
      <PageHeader title="Panel" description={`${ctx.tenantName} · bu ayın nakit özeti`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <div className="card p-5">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{c.value}</p>
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
