import { requireAuth, canManageOperations, canOverrideContractAmounts } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { CHANNEL_TR, STATUS_TR, fmtDate, fmtMoney, fmtMonth, resolveActiveAcademicYear } from "@/lib/format";
import { scheduleStatus } from "@/server/income-schedule";
import { ensureDefaultIncomePlanCategories } from "@/app/actions/income-plans";
import { IncomeCategoryCreateModal, IncomePlanCreateModal } from "./income-plan-form";

const color = { BLOCKED: "amber", EXPECTED: "blue", REALIZED: "green" } as const;

export default async function IncomePlanPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const canOverride = canOverrideContractAmounts(ctx.isSuperAdmin);

  await ensureDefaultIncomePlanCategories(ctx.tenantId, ctx.db);

  const yearRows = await ctx.db.enrollment.findMany({
    distinct: ["academicYear"],
    select: { academicYear: true },
  });
  const activeYear = resolveActiveAcademicYear(yearRows.map((r) => r.academicYear));

  const [categories, plans, enrollments] = await Promise.all([
    ctx.db.incomePlanCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    ctx.db.incomePlan.findMany({
      orderBy: { planDate: "desc" },
      include: {
        category: true,
        lines: { orderBy: { installmentIndex: "asc" } },
      },
      take: 200,
    }),
    ctx.db.enrollment.findMany({
      where: { status: "ACTIVE", academicYear: activeYear },
      include: { student: { select: { id: true, fullName: true, classroom: true } } },
      orderBy: { student: { fullName: "asc" } },
    }),
  ]);

  const enrollmentNames = new Map(
    enrollments.map((e) => [e.id, e.student.fullName] as const),
  );

  const students = enrollments.map((e) => ({
    enrollmentId: e.id,
    fullName: e.student.fullName,
    classroom: e.student.classroom,
    academicYear: e.academicYear,
    annualFee: Number(e.annualFee),
    paymentChannel: e.paymentChannel,
    sourcePaymentPlan: e.sourcePaymentPlan,
  }));

  const lines = plans.flatMap((p) =>
    p.lines.map((line) => ({
      ...line,
      plan: p,
      liveStatus: scheduleStatus(line.releaseDate, false),
      studentName: p.enrollmentId ? enrollmentNames.get(p.enrollmentId) ?? null : null,
    })),
  );

  const grouped = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = grouped.get(line.yearMonth) ?? [];
    list.push(line);
    grouped.set(line.yearMonth, list);
  }
  const months = [...grouped.keys()].sort();

  return (
    <div>
      <PageHeader
        title="Gelir planı"
        description="Öğrenci ve tutarlar okul sisteminden gelir. Plan tarihi geçmiş bir gün olabilir — eski kayıtları işlemek için uygun tarihi seçin. Plan oluşturmadan aylık tabloya düşmez."
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <IncomeCategoryCreateModal />
              <IncomePlanCreateModal
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  requiresStudent: c.requiresStudent,
                }))}
                students={students}
                canOverrideAmount={canOverride}
              />
            </div>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {months.map((ym) => {
          const rows = grouped.get(ym) ?? [];
          const totals = { BLOCKED: 0, EXPECTED: 0, REALIZED: 0 };
          for (const r of rows) totals[r.liveStatus] += Number(r.amount);
          return (
            <section key={ym} className="overflow-hidden card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="font-semibold text-slate-800">{fmtMonth(ym)}</h2>
                <p className="text-xs text-slate-500">
                  Bloke {fmtMoney(totals.BLOCKED)} · Beklenen {fmtMoney(totals.EXPECTED)} · Gerçekleşen{" "}
                  {fmtMoney(totals.REALIZED)}
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                    <th className="px-4 py-2">Kalem / Öğrenci</th>
                    <th className="px-4 py-2">Kanal</th>
                    <th className="px-4 py-2">Taksit</th>
                    <th className="px-4 py-2 text-right">Tutar</th>
                    <th className="px-4 py-2">Serbest</th>
                    <th className="px-4 py-2">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="td">
                        <span className="font-medium">{r.plan.category.name}</span>
                        {r.studentName ? (
                          <span className="block text-xs text-slate-500">{r.studentName}</span>
                        ) : null}
                      </td>
                      <td className="td">{CHANNEL_TR[r.plan.paymentChannel]}</td>
                      <td className="td">
                        {r.installmentIndex}/{r.plan.installmentCount}
                      </td>
                      <td className="td text-right">{fmtMoney(Number(r.amount))}</td>
                      <td className="td text-slate-500">{fmtDate(r.releaseDate)}</td>
                      <td className="td">
                        <Badge color={color[r.liveStatus]}>{STATUS_TR[r.liveStatus]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
        {months.length === 0 && (
          <p className="text-sm text-slate-500">Henüz gelir planı yok. “Gelir planı ekle” ile oluşturun.</p>
        )}
      </div>
    </div>
  );
}
