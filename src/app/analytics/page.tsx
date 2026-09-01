import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AnalyticsView } from "@/components/analytics-view";
import { collectMonthDatasets } from "@/db/analytics-queries";
import {
  listCategories,
  listGoals,
  listIncomeCategories,
} from "@/db/queries";
import { getOrCreateCurrentMonth } from "@/lib/month-service";
import { ownerFromUserName } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage(): Promise<React.ReactElement> {
  const session = await requireUser();
  const [categories, goals, datasets, incomeCategories] = await Promise.all([
    listCategories(false),
    listGoals(),
    collectMonthDatasets(12),
    listIncomeCategories(false),
  ]);
  const currentMonth = await getOrCreateCurrentMonth(session.userId);
  return (
    <AppShell
      userName={session.name}
      userOwner={ownerFromUserName(session.name)}
      categories={categories}
      incomeCategories={incomeCategories}
    >
      <AnalyticsView
        datasets={datasets}
        categories={categories}
        goals={goals}
        currentRate={currentMonth.exchangeRate}
      />
    </AppShell>
  );
}
