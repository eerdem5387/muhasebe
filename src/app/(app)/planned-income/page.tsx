import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { loadPlannedIncomeMonth, parseMonthParam } from "@/server/planned-income";
import { PlannedIncomeCalendar } from "./calendar-view";

export default async function PlannedIncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireAuth();
  const month = parseMonthParam((await searchParams).month);
  const events = await loadPlannedIncomeMonth(ctx.db, month);

  return (
    <div>
      <PageHeader
        title="Planlanmış gelirler"
        description="Yalnızca Gelir planı ile oluşturduğunuz kalemler burada görünür. Turuncu planlanan, yeşil hesaba geçen ödemelerdir."
      />
      <PlannedIncomeCalendar key={month} month={month} events={events} />
    </div>
  );
}
