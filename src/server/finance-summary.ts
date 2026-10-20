import "server-only"
import { prisma, getTenantDb } from "@/lib/prisma"
import { toYearMonth } from "@/lib/format"
import { scheduleStatus } from "@/server/income-schedule"

/** Okul kurucu paneli için anlık mali özet (snapshot’tan bağımsız). */
export async function exportFinanceSummary(tenantId: string, yearMonth?: string) {
  const db = getTenantDb(tenantId)
  const ym = yearMonth && /^\d{4}-\d{2}$/.test(yearMonth) ? yearMonth : toYearMonth(new Date())

  const months: string[] = []
  {
    const [y, m] = ym.split("-").map(Number)
    const base = new Date(y, m - 1, 1)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      months.push(toYearMonth(d))
    }
  }

  const [
    scheduleLines,
    cashbookMonth,
    cashbookTrend,
    pendingCount,
    approvedAwaitingCount,
    students,
    collections,
    enrollmentCount,
    tenant,
  ] = await Promise.all([
    db.incomeScheduleLine.findMany({
      where: { yearMonth: ym, enrollment: { status: "ACTIVE" } },
      include: { enrollment: { include: { collections: { select: { id: true } } } } },
    }),
    db.cashbookEntry.findMany({
      where: { yearMonth: ym },
      select: {
        side: true,
        amount: true,
        channel: true,
        incomeCategory: true,
      },
    }),
    db.cashbookEntry.findMany({
      where: { yearMonth: { in: months } },
      select: { yearMonth: true, side: true, amount: true },
    }),
    db.expenseRequest.count({ where: { status: "PENDING" } }),
    db.expenseRequest.count({ where: { status: "APPROVED" } }),
    db.student.count(),
    db.collection.findMany({ select: { enrollmentId: true, amount: true } }),
    db.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { id: true, name: true } }),
  ])

  let incomeRealized = 0
  let incomeExpected = 0
  let incomeBlocked = 0
  for (const line of scheduleLines) {
    const status = scheduleStatus(line.releaseDate, line.enrollment.collections.length > 0)
    const n = Number(line.amount)
    if (status === "BLOCKED") incomeBlocked += n
    else if (status === "EXPECTED") incomeExpected += n
    else incomeRealized += n
  }

  let cashIncome = 0
  let cashExpense = 0
  const expenseByChannel: Record<string, number> = {}
  const incomeByCategory: Record<string, number> = {}

  for (const e of cashbookMonth) {
    const amt = Number(e.amount)
    if (e.side === "INCOME") {
      cashIncome += amt
      const cat = e.incomeCategory || "OTHER"
      incomeByCategory[cat] = (incomeByCategory[cat] ?? 0) + amt
    } else {
      cashExpense += amt
      const ch = e.channel || "CASH"
      expenseByChannel[ch] = (expenseByChannel[ch] ?? 0) + amt
    }
  }

  const series = months.map((month) => {
    const rows = cashbookTrend.filter((e) => e.yearMonth === month)
    const income = rows.filter((e) => e.side === "INCOME").reduce((s, e) => s + Number(e.amount), 0)
    const expense = rows
      .filter((e) => e.side === "EXPENSE")
      .reduce((s, e) => s + Number(e.amount), 0)
    return { month, income, expense, net: income - expense }
  })

  const collectedEnrollments = new Set(collections.map((c) => c.enrollmentId)).size
  const collectionAmount = collections.reduce((s, c) => s + Number(c.amount), 0)
  const collectionRate = enrollmentCount
    ? Math.round((collectedEnrollments / enrollmentCount) * 100)
    : 0

  return {
    tenantId,
    tenantName: tenant?.name ?? null,
    yearMonth: ym,
    exportedAt: new Date().toISOString(),
    schedule: {
      realized: incomeRealized,
      expected: incomeExpected,
      blocked: incomeBlocked,
    },
    cashbook: {
      income: cashIncome,
      expense: cashExpense,
      net: cashIncome - cashExpense,
      expenseByChannel,
      incomeByCategory,
    },
    series,
    requests: {
      pending: pendingCount,
      approvedAwaiting: approvedAwaitingCount,
    },
    students: {
      total: students,
      activeEnrollments: enrollmentCount,
      collectedEnrollments,
      collectionRate,
      collectionAmount,
    },
  }
}
