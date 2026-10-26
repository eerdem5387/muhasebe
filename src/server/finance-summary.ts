import "server-only"
import { prisma, getTenantDb } from "@/lib/prisma"
import { toYearMonth } from "@/lib/format"
import { scheduleStatus } from "@/server/income-schedule"

function academicYearNeedles(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  const keys = new Set<string>([trimmed])
  const match = trimmed.match(/(20\d{2})\s*[-–]\s*(20\d{2})/)
  if (match) keys.add(`${match[1]}-${match[2]}`)
  return [...keys]
}

function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function cashbookTitle(row: {
  side: string
  expenseTitle: string | null
  payerFirstName: string | null
  payerLastName: string | null
  incomeCategory: string | null
  notes: string | null
}): string {
  if (row.side === "EXPENSE") return row.expenseTitle || row.notes || "Gider"
  const name = [row.payerFirstName, row.payerLastName].filter(Boolean).join(" ")
  return name || row.incomeCategory || row.notes || "Gelir"
}

/** Okul kurucu paneli için anlık mali özet (snapshot’tan bağımsız). */
export async function exportFinanceSummary(
  tenantId: string,
  yearMonth?: string,
  academicYear?: string | null,
) {
  const db = getTenantDb(tenantId)
  const currentYm = toYearMonth(new Date())
  const ym = yearMonth && /^\d{4}-\d{2}$/.test(yearMonth) ? yearMonth : currentYm
  const yearNeedles = academicYearNeedles(academicYear)

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
    yearEnrollments,
    monthExpenses,
    ledgerEntries,
    monthKeys,
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
    yearNeedles.length
      ? db.enrollment.findMany({
          where: { status: "ACTIVE", academicYear: { in: yearNeedles } },
          select: {
            annualFee: true,
            sourceKind: true,
            collections: { select: { amount: true } },
          },
        })
      : Promise.resolve([]),
    db.cashbookEntry.findMany({
      where: { yearMonth: currentYm, side: "EXPENSE" },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        amount: true,
        occurredAt: true,
        expenseTitle: true,
        notes: true,
        channel: true,
        side: true,
        payerFirstName: true,
        payerLastName: true,
        incomeCategory: true,
      },
    }),
    db.cashbookEntry.findMany({
      where: { yearMonth: ym },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        side: true,
        amount: true,
        occurredAt: true,
        expenseTitle: true,
        notes: true,
        payerFirstName: true,
        payerLastName: true,
        incomeCategory: true,
      },
    }),
    db.cashbookEntry.findMany({
      distinct: ["yearMonth"],
      select: { yearMonth: true },
      orderBy: { yearMonth: "desc" },
    }),
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

  let expectedIncome = 0
  let collectedTotal = 0
  let collectedNew = 0
  let collectedRenewal = 0
  let collectedUnclassified = 0
  for (const enrollment of yearEnrollments) {
    expectedIncome += Number(enrollment.annualFee)
    const paid = enrollment.collections.reduce((sum, row) => sum + Number(row.amount), 0)
    collectedTotal += paid
    if (enrollment.sourceKind === "NEW_REGISTRATION") collectedNew += paid
    else if (enrollment.sourceKind === "RENEWAL") collectedRenewal += paid
    else collectedUnclassified += paid
  }

  const expenseTotal = monthExpenses.reduce((sum, row) => sum + Number(row.amount), 0)
  const dailyMap = new Map<string, { income: number; expense: number }>()
  let ledgerIncome = 0
  let ledgerExpense = 0
  for (const row of ledgerEntries) {
    const amount = Number(row.amount)
    const key = dayKey(row.occurredAt)
    const bucket = dailyMap.get(key) ?? { income: 0, expense: 0 }
    if (row.side === "INCOME") {
      bucket.income += amount
      ledgerIncome += amount
    } else {
      bucket.expense += amount
      ledgerExpense += amount
    }
    dailyMap.set(key, bucket)
  }
  const availableMonths = monthKeys.map((row) => row.yearMonth)
  if (!availableMonths.includes(currentYm)) availableMonths.unshift(currentYm)

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
    founder: {
      academicYear: academicYear?.trim() || null,
      expectedIncome,
      collectedTotal,
      collectedNew,
      collectedRenewal,
      collectedUnclassified,
      expenseMonth: currentYm,
      expenseTotal,
      expenses: monthExpenses.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        title: cashbookTitle(row),
        amount: Number(row.amount),
        channel: row.channel,
      })),
      selectedMonth: ym,
      ledgerIncome,
      ledgerExpense,
      months: availableMonths,
      rows: ledgerEntries.map((row) => ({
        id: row.id,
        side: row.side,
        occurredAt: row.occurredAt.toISOString(),
        title: cashbookTitle(row),
        amount: Number(row.amount),
      })),
      daily: [...dailyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, totals]) => ({ date, ...totals })),
    },
  }
}
