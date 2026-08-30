import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";
import { MonthWorkspace } from "@/components/month-workspace";
import {
  getMonthByYearMonth,
  listCategories,
  listContributionsByMonth,
  listDailyExpenses,
  listGoals,
  listIncomeCategories,
  listIncomes,
  listPlannedPayments,
  listUsers,
} from "@/db/queries";
import { ownerFromUserName } from "@/lib/owner";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ year: string; month: string }>;
}

export default async function MonthPage({
  params,
}: RouteParams): Promise<React.ReactElement> {
  const session = await requireUser();
  const { year: yRaw, month: mRaw } = await params;
  const year = Number(yRaw);
  const month = Number(mRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) notFound();
  const monthRow = await getMonthByYearMonth(year, month);
  if (!monthRow) notFound();
  const [
    categories,
    incomeCategories,
    plans,
    expenses,
    incomes,
    goals,
    contribs,
    users,
  ] = await Promise.all([
    listCategories(true),
    listIncomeCategories(true),
    listPlannedPayments(monthRow.id),
    listDailyExpenses(monthRow.id, {
      includePrivateOfUserId: session.userId,
    }),
    listIncomes(monthRow.id),
    listGoals(),
    listContributionsByMonth(monthRow.id),
    listUsers(),
  ]);
  return (
    <AppShell
      userName={session.name}
      userOwner={ownerFromUserName(session.name)}
      categories={categories.filter((c) => !c.archived)}
      incomeCategories={incomeCategories.filter((c) => !c.archived)}
    >
      <AutoRefresh intervalMs={60000} />
      <MonthWorkspace
        currentUserId={session.userId}
        month={monthRow}
        categories={categories}
        incomeCategories={incomeCategories}
        initialPlannedPayments={plans}
        initialDailyExpenses={expenses}
        initialIncomes={incomes}
        goals={goals}
        contributions={contribs}
        users={users}
      />
    </AppShell>
  );
}
