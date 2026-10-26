import "server-only"
import { prisma, getTenantDb } from "@/lib/prisma"
import { CASHBOOK_CHANNEL_TR, cashbookTitle as cashbookEntryTitle } from "@/lib/cashbook"
import { CHANNEL_TR, toYearMonth } from "@/lib/format"
import { scheduleStatus } from "@/server/income-schedule"

const CASH_INCOME_LABEL: Record<string, string> = {
  TRIP: "Gezi geliri",
  FOOD: "Yemek geliri",
  OTHER: "Diğer gelir",
}

function academicYearMonths(needles: string[]): string[] {
  for (const raw of needles) {
    const match = raw.match(/^(20\d{2})-(20\d{2})$/)
    if (!match) continue
    const start = Number(match[1])
    const end = Number(match[2])
    if (end !== start + 1) continue
    const months: string[] = []
    for (let month = 9; month <= 12; month += 1) {
      months.push(`${start}-${String(month).padStart(2, "0")}`)
    }
    for (let month = 1; month <= 8; month += 1) {
      months.push(`${end}-${String(month).padStart(2, "0")}`)
    }
    return months
  }
  return []
}

function isStudentFeeCategory(name: string) {
  return name.trim().toLocaleLowerCase("tr-TR") === "öğrenci geliri"
}

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

function paymentChannelLabel(channel: string | null | undefined): string {
  if (!channel) return "—"
  if (channel in CHANNEL_TR) return CHANNEL_TR[channel]
  if (channel in CASHBOOK_CHANNEL_TR) {
    return CASHBOOK_CHANNEL_TR[channel as keyof typeof CASHBOOK_CHANNEL_TR]
  }
  return channel
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
  const yearMonths = academicYearMonths(yearNeedles)

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
    planLines,
    monthKeys,
    otherPlanLines,
    otherCashIncome,
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
            student: { select: { fullName: true } },
            collections: {
              select: { id: true, amount: true, collectedAt: true, paymentChannel: true },
            },
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
        channel: true,
      },
    }),
    db.incomePlanLine.findMany({
      where: { yearMonth: ym },
      include: {
        plan: {
          select: {
            paymentChannel: true,
            notes: true,
            category: { select: { name: true } },
            enrollment: { select: { student: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: [{ releaseDate: "asc" }, { installmentIndex: "asc" }],
    }),
    db.cashbookEntry.findMany({
      distinct: ["yearMonth"],
      select: { yearMonth: true },
      orderBy: { yearMonth: "desc" },
    }),
    yearNeedles.length
      ? db.incomePlanLine.findMany({
          where: { status: "REALIZED" },
          select: {
            id: true,
            amount: true,
            releaseDate: true,
            yearMonth: true,
            plan: {
              select: {
                enrollmentId: true,
                paymentChannel: true,
                category: { select: { name: true } },
                enrollment: {
                  select: {
                    status: true,
                    academicYear: true,
                    student: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    yearMonths.length
      ? db.cashbookEntry.findMany({
          where: {
            side: "INCOME",
            yearMonth: { in: yearMonths },
            incomeCategory: { in: ["TRIP", "FOOD", "OTHER"] },
          },
          select: {
            id: true,
            amount: true,
            occurredAt: true,
            channel: true,
            incomeCategory: true,
            payerFirstName: true,
            payerLastName: true,
            notes: true,
          },
        })
      : Promise.resolve([]),
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
  const incomeDetails: Array<{
    id: string
    category: string
    title: string
    occurredAt: string
    amount: number
    channel: string | null
    channelLabel: string
  }> = []
  for (const enrollment of yearEnrollments) {
    expectedIncome += Number(enrollment.annualFee)
    const paid = enrollment.collections.reduce((sum, row) => sum + Number(row.amount), 0)
    collectedTotal += paid
    const category =
      enrollment.sourceKind === "NEW_REGISTRATION"
        ? "Yeni kayıt"
        : enrollment.sourceKind === "RENEWAL"
          ? "Kayıt yenileme"
          : "Diğer kayıt"
    if (enrollment.sourceKind === "NEW_REGISTRATION") collectedNew += paid
    else if (enrollment.sourceKind === "RENEWAL") collectedRenewal += paid
    else collectedUnclassified += paid
    for (const row of enrollment.collections) {
      incomeDetails.push({
        id: row.id,
        category,
        title: enrollment.student?.fullName?.trim() || "Öğrenci",
        occurredAt: row.collectedAt.toISOString(),
        amount: Number(row.amount),
        channel: row.paymentChannel,
        channelLabel: paymentChannelLabel(row.paymentChannel),
      })
    }
  }

  const yearSet = new Set(yearNeedles)
  const monthSet = new Set(yearMonths)
  for (const line of otherPlanLines) {
    const categoryName = line.plan.category.name.trim()
    if (isStudentFeeCategory(categoryName)) continue
    const enrollment = line.plan.enrollment
    const inYear = Boolean(
      enrollment && enrollment.status === "ACTIVE" && yearSet.has(enrollment.academicYear)
    )
    const unlinkedInYear = !line.plan.enrollmentId && monthSet.has(line.yearMonth)
    if (!inYear && !unlinkedInYear) continue
    incomeDetails.push({
      id: `plan:${line.id}`,
      category: categoryName,
      title: enrollment?.student?.fullName?.trim() || categoryName,
      occurredAt: line.releaseDate.toISOString(),
      amount: Number(line.amount),
      channel: line.plan.paymentChannel,
      channelLabel: paymentChannelLabel(line.plan.paymentChannel),
    })
  }
  for (const row of otherCashIncome) {
    const category = CASH_INCOME_LABEL[row.incomeCategory ?? ""] ?? "Diğer gelir"
    const payer = [row.payerFirstName, row.payerLastName].filter(Boolean).join(" ").trim()
    incomeDetails.push({
      id: `cash:${row.id}`,
      category,
      title: payer || row.notes?.trim() || category,
      occurredAt: row.occurredAt.toISOString(),
      amount: Number(row.amount),
      channel: row.channel,
      channelLabel: paymentChannelLabel(row.channel),
    })
  }
  const preferredCategories = ["Yeni kayıt", "Kayıt yenileme"]
  incomeDetails.sort((a, b) => {
    const rank = (category: string) => {
      const index = preferredCategories.indexOf(category)
      return index === -1 ? preferredCategories.length : index
    }
    const byRank = rank(a.category) - rank(b.category)
    if (byRank !== 0) return byRank
    const byName = a.category.localeCompare(b.category, "tr")
    if (byName !== 0) return byName
    return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  })
  const categoryTotals = new Map<string, number>()
  for (const row of incomeDetails) {
    categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + row.amount)
  }
  const categoryNames = [...preferredCategories]
  for (const row of incomeDetails) {
    if (!categoryNames.includes(row.category)) categoryNames.push(row.category)
  }
  const incomeCategories = categoryNames
    .filter(
      (name) =>
        preferredCategories.includes(name) || (categoryTotals.get(name) ?? 0) > 0
    )
    .map((name) => ({ name, amount: categoryTotals.get(name) ?? 0 }))

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

  const statementRows = [
    ...ledgerEntries.map((row) => ({
      id: row.id,
      side: row.side,
      occurredAt: row.occurredAt.toISOString(),
      title:
        row.side === "EXPENSE"
          ? row.expenseTitle?.trim() || row.notes?.trim() || "Gider"
          : cashbookEntryTitle({
              side: "INCOME",
              incomeCategory: row.incomeCategory,
              payerFirstName: row.payerFirstName,
              payerLastName: row.payerLastName,
              expenseTitle: row.expenseTitle,
            }),
      amount: Number(row.amount),
      channel: row.channel,
      channelLabel: paymentChannelLabel(row.channel),
      tag: null as "PLANNED" | "CREDITED" | null,
    })),
    ...planLines.map((line) => {
      const student = line.plan.enrollment?.student
      const tag = line.status === "REALIZED" ? ("CREDITED" as const) : ("PLANNED" as const)
      return {
        id: `plan:${line.id}`,
        side: "INCOME" as const,
        occurredAt: line.releaseDate.toISOString(),
        title: student ? `${line.plan.category.name} · ${student.fullName}` : line.plan.category.name,
        amount: Number(line.amount),
        channel: line.plan.paymentChannel,
        channelLabel: paymentChannelLabel(line.plan.paymentChannel),
        tag,
      }
    }),
  ].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() ||
      a.title.localeCompare(b.title, "tr")
  )

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
      tenantName: tenant?.name ?? null,
      academicYear: academicYear?.trim() || null,
      expectedIncome,
      collectedTotal,
      collectedNew,
      collectedRenewal,
      collectedUnclassified,
      incomeCategories,
      incomeDetails,
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
      rows: statementRows,
      daily: [...dailyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, totals]) => ({ date, ...totals })),
    },
  }
}
