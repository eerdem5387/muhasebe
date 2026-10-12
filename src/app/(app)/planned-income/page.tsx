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
        description="Ay ay hesabınıza geçecek tutarları takvimden görün. Turuncu planlanan, yeşil hesaba geçen ödemelerdir."
      />
      <PlannedIncomeCalendar key={month} month={month} events={events} />
    </div>
  );
}
