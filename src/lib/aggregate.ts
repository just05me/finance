import type {
  Category,
  DailyExpense,
  GoalContribution,
  Income,
  IncomeCategory,
  PlannedPayment,
  SavingsGoal,
} from "@/db/schema";
import { goalTargetUsd, plannedUsdEquivalent, usdEquivalent } from "./format";

export interface CategoryTotal {
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  totalUsd: number;
}

export interface DayTotal {
  date: string;
  totalUsd: number;
}

export interface OwnerTotal {
  owner: string;
  totalUsd: number;
}

export function totalExpensesUsd(
  expenses: DailyExpense[],
  rate: number,
): number {
  return expenses.reduce(
    (sum, e) => sum + usdEquivalent(e.amountUsd, e.amountUzs, rate),
    0,
  );
}

export function totalIncomesUsd(incomes: Income[], rate: number): number {
  return incomes.reduce(
    (sum, i) => sum + usdEquivalent(i.amountUsd, i.amountUzs, rate),
    0,
  );
}

export function totalPlannedUsd(
  payments: PlannedPayment[],
  rate: number,
): number {
  return payments.reduce(
    (sum, p) =>
      sum + plannedUsdEquivalent(p.currency, p.planAmount, p.factAmount, rate),
    0,
  );
}

export function totalPlannedPlanOnlyUsd(
  payments: PlannedPayment[],
  rate: number,
): number {
  return payments.reduce(
    (sum, p) => sum + plannedUsdEquivalent(p.currency, p.planAmount, null, rate),
    0,
  );
}

export function activeGoalsMonthlyPlanUsd(
  goals: SavingsGoal[],
  rate: number,
): number {
  return goals
    .filter((g) => g.status === "Активна")
    .reduce(
      (sum, g) => sum + goalTargetUsd(g.currency, g.monthlyContribution, rate),
      0,
    );
}

export function contributionsPlanFactUsd(
  contribs: GoalContribution[],
  goals: SavingsGoal[],
  rate: number,
): { planUsd: number; factUsd: number } {
  const currencyById = new Map(goals.map((g) => [g.id, g.currency] as const));
  let planUsd = 0;
  let factUsd = 0;
  for (const c of contribs) {
    const currency = currencyById.get(c.goalId) ?? "USD";
    planUsd += goalTargetUsd(currency, c.planAmount, rate);
    factUsd += goalTargetUsd(currency, c.factAmount, rate);
  }
  return { planUsd, factUsd };
}

export function needToEarnUsd(
  payments: PlannedPayment[],
  goals: SavingsGoal[],
  rate: number,
): number {
  return (
    totalPlannedPlanOnlyUsd(payments, rate) +
    activeGoalsMonthlyPlanUsd(goals, rate)
  );
}

export function expensesByCategory(
  expenses: DailyExpense[],
  categories: Category[],
  rate: number,
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c] as const));
  const totals = new Map<number, number>();
  for (const e of expenses) {
    const val = usdEquivalent(e.amountUsd, e.amountUzs, rate);
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + val);
  }
  return [...totals.entries()]
    .map(([categoryId, totalUsd]) => {
      const cat = byId.get(categoryId);
      return {
        categoryId,
        categoryName: cat?.name ?? "Прочее",
        categoryIcon: cat?.icon ?? null,
        totalUsd,
      };
    })
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

export function incomesByCategory(
  incomes: Income[],
  categories: IncomeCategory[],
  rate: number,
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c] as const));
  const totals = new Map<number, number>();
  for (const i of incomes) {
    const val = usdEquivalent(i.amountUsd, i.amountUzs, rate);
    totals.set(i.incomeCategoryId, (totals.get(i.incomeCategoryId) ?? 0) + val);
  }
  return [...totals.entries()]
    .map(([categoryId, totalUsd]) => {
      const cat = byId.get(categoryId);
      return {
        categoryId,
        categoryName: cat?.name ?? "Прочее",
        categoryIcon: cat?.icon ?? null,
        totalUsd,
      };
    })
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

export function expensesByOwner(
  expenses: DailyExpense[],
  rate: number,
): OwnerTotal[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    const val = usdEquivalent(e.amountUsd, e.amountUzs, rate);
    totals.set(e.owner, (totals.get(e.owner) ?? 0) + val);
  }
  return [...totals.entries()]
    .map(([owner, totalUsd]) => ({ owner, totalUsd }))
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

export function dailyTotals(
  expenses: DailyExpense[],
  rate: number,
): DayTotal[] {
  const byDate = new Map<string, number>();
  for (const e of expenses) {
    const val = usdEquivalent(e.amountUsd, e.amountUzs, rate);
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + val);
  }
  return [...byDate.entries()]
    .map(([date, totalUsd]) => ({ date, totalUsd }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface MonthSummary {
  needToEarn: number;
  earned: number;
  earnedRemaining: number;
  spent: number;
  free: number;
  contributionsPlan: number;
  contributionsFact: number;
  overdueOnPlan: boolean;
  overdueOnContributions: boolean;
  overspent: boolean;
  freeNegative: boolean;
}

export interface MonthSummaryInput {
  payments: PlannedPayment[];
  expenses: DailyExpense[];
  incomes: Income[];
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  rate: number;
  todayIso?: string;
  monthYear?: { year: number; month: number };
}

function isPastDay20(todayIso: string, month: { year: number; month: number }): boolean {
  const now = new Date(todayIso);
  if (Number.isNaN(now.getTime())) return false;
  if (now.getFullYear() !== month.year) return now.getFullYear() > month.year;
  if (now.getMonth() + 1 !== month.month) return now.getMonth() + 1 > month.month;
  return now.getDate() >= 20;
}

export function summarizeMonth({
  payments,
  expenses,
  incomes,
  goals,
  contributions,
  rate,
  todayIso: today,
  monthYear,
}: MonthSummaryInput): MonthSummary {
  const needToEarn = needToEarnUsd(payments, goals, rate);
  const earned = totalIncomesUsd(incomes, rate);
  const spent = totalExpensesUsd(expenses, rate);
  const { planUsd: contribPlan, factUsd: contribFact } =
    contributionsPlanFactUsd(contributions, goals, rate);
  const earnedRemaining = Math.max(0, needToEarn - earned);
  const free = earned - spent - contribFact;
  const now = today ?? new Date().toISOString().slice(0, 10);
  const past20 = monthYear ? isPastDay20(now, monthYear) : false;
  const overdueOnContributions = past20 && contribFact < contribPlan - 0.01;
  const overspent = spent > earned + 0.01;
  const freeNegative = free < -0.01;
  const overdueOnPlan = payments.some((p) => {
    if (p.paid || !p.dueDay || !monthYear) return false;
    const isSameOrPastMonth =
      new Date(now).getFullYear() > monthYear.year ||
      (new Date(now).getFullYear() === monthYear.year &&
        new Date(now).getMonth() + 1 > monthYear.month) ||
      (new Date(now).getFullYear() === monthYear.year &&
        new Date(now).getMonth() + 1 === monthYear.month &&
        new Date(now).getDate() > p.dueDay);
    return isSameOrPastMonth;
  });
  return {
    needToEarn,
    earned,
    earnedRemaining,
    spent,
    free,
    contributionsPlan: contribPlan,
    contributionsFact: contribFact,
    overdueOnPlan,
    overdueOnContributions,
    overspent,
    freeNegative,
  };
}
