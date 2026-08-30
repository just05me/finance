import { desc } from "drizzle-orm";
import { db } from "./client";
import {
  dailyExpenses,
  goalContributions,
  incomes,
  months,
  plannedPayments,
} from "./schema";
import type { MonthDataset } from "@/lib/analytics";
import { totalPlannedPlanOnlyUsd } from "@/lib/aggregate";

export async function collectMonthDatasets(
  limit = 12,
): Promise<MonthDataset[]> {
  const monthRows = await db
    .select()
    .from(months)
    .orderBy(desc(months.year), desc(months.month))
    .limit(limit);
  if (monthRows.length === 0) return [];
  const [allExpenses, allIncomes, allPlans, allContribs] = await Promise.all([
    db.select().from(dailyExpenses),
    db.select().from(incomes),
    db.select().from(plannedPayments),
    db.select().from(goalContributions),
  ]);
  return monthRows.map((m) => {
    const plans = allPlans.filter((p) => p.monthId === m.id);
    return {
      month: m,
      expenses: allExpenses.filter((e) => e.monthId === m.id),
      incomes: allIncomes.filter((i) => i.monthId === m.id),
      contributions: allContribs.filter((c) => c.monthId === m.id),
      planUsd: totalPlannedPlanOnlyUsd(plans, m.exchangeRate),
    };
  });
}
