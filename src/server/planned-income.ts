import { CHANNEL_TR, toYearMonth } from "@/lib/format";

export type PlannedIncomeEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  yearMonth: string;
  amount: number;
  title: string;
  source: string;
  channel: string;
  status: "PLANNED" | "CREDITED";
  href: string | null;
};

// Tenant-scoped Prisma client (extended)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

function dayKey(d: Date): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export async function loadPlannedIncomeMonth(db: Db, yearMonth: string): Promise<PlannedIncomeEvent[]> {
  const [scheduleLines, planLines] = await Promise.all([
    db.incomeScheduleLine.findMany({
      where: { yearMonth },
      include: {
        enrollment: {
          select: {
            paymentChannel: true,
            student: { select: { id: true, fullName: true, classroom: true } },
          },
        },
      },
      orderBy: [{ releaseDate: "asc" }, { installmentIndex: "asc" }],
    }),
    db.incomePlanLine.findMany({
      where: { yearMonth, plan: { enrollmentId: null } },
      include: {
        plan: {
          select: {
            paymentChannel: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ releaseDate: "asc" }, { installmentIndex: "asc" }],
    }),
  ]);

  const events: PlannedIncomeEvent[] = [];

  for (const line of scheduleLines) {
    const channel = line.plannedChannel ?? line.enrollment.paymentChannel;
    const classroom = line.enrollment.student.classroom;
    events.push({
      id: `schedule:${line.id}`,
      date: dayKey(line.releaseDate),
      yearMonth: line.yearMonth,
      amount: Number(line.amount),
      title: line.enrollment.student.fullName,
      source: classroom ? `Öğrenci · ${classroom}` : "Öğrenci",
      channel: CHANNEL_TR[channel] ?? channel,
      status: line.status === "REALIZED" ? "CREDITED" : "PLANNED",
      href: `/students/${line.enrollment.student.id}`,
    });
  }

  for (const line of planLines) {
    events.push({
      id: `plan:${line.id}`,
      date: dayKey(line.releaseDate),
      yearMonth: line.yearMonth,
      amount: Number(line.amount),
      title: line.plan.category.name,
      source: "Gelir planı",
      channel: CHANNEL_TR[line.plan.paymentChannel] ?? line.plan.paymentChannel,
      status: line.status === "REALIZED" ? "CREDITED" : "PLANNED",
      href: "/collections",
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "tr"));
  return events;
}

export function parseMonthParam(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return toYearMonth(new Date());
}
