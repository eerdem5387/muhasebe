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

/** Yalnızca "Gelir planı" ile oluşturulmuş satırlar. */
export async function loadPlannedIncomeMonth(db: Db, yearMonth: string): Promise<PlannedIncomeEvent[]> {
  const planLines = await db.incomePlanLine.findMany({
    where: { yearMonth },
    include: {
      plan: {
        select: {
          paymentChannel: true,
          category: { select: { name: true } },
          enrollment: {
            select: {
              student: { select: { id: true, fullName: true, classroom: true } },
            },
          },
        },
      },
    },
    orderBy: [{ releaseDate: "asc" }, { installmentIndex: "asc" }],
  });

  const events: PlannedIncomeEvent[] = planLines.map((line: {
    id: string;
    amount: { toString(): string } | number;
    releaseDate: Date;
    yearMonth: string;
    status: string;
    plan: {
      paymentChannel: string;
      category: { name: string };
      enrollment: { student: { id: string; fullName: string; classroom: string | null } } | null;
    };
  }) => {
    const student = line.plan.enrollment?.student;
    const classroom = student?.classroom;
    return {
      id: `plan:${line.id}`,
      date: dayKey(line.releaseDate),
      yearMonth: line.yearMonth,
      amount: Number(line.amount),
      title: student?.fullName ?? line.plan.category.name,
      source: student
        ? classroom
          ? `${line.plan.category.name} · ${classroom}`
          : line.plan.category.name
        : "Gelir planı",
      channel: CHANNEL_TR[line.plan.paymentChannel] ?? line.plan.paymentChannel,
      status: line.status === "REALIZED" ? "CREDITED" as const : "PLANNED" as const,
      href: student ? `/students/${student.id}` : "/collections",
    };
  });

  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "tr"));
  return events;
}

export function parseMonthParam(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return toYearMonth(new Date());
}
