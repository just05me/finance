import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { GoalsView } from "@/components/goals-view";
import {
  listAllContributions,
  listCategories,
  listGoals,
  listIncomeCategories,
  listMonths,
} from "@/db/queries";
import { getOrCreateCurrentMonth } from "@/lib/month-service";
import { ownerFromUserName } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function GoalsPage(): Promise<React.ReactElement> {
  const session = await requireUser();
  const [categories, incomeCategories, goals, allContribs, months] =
    await Promise.all([
      listCategories(false),
      listIncomeCategories(false),
      listGoals(),
      listAllContributions(),
      listMonths(),
    ]);
  const currentMonth = await getOrCreateCurrentMonth(session.userId);
  return (
    <AppShell
      userName={session.name}
      userOwner={ownerFromUserName(session.name)}
      categories={categories}
      incomeCategories={incomeCategories}
    >
      <GoalsView
        goals={goals}
        contributions={allContribs}
        months={months}
        currentMonthId={currentMonth.id}
      />
    </AppShell>
  );
}
