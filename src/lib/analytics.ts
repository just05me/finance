import type {
  Category,
  DailyExpense,
  GoalContribution,
  Income,
  IncomeCategory,
  Month,
  SavingsGoal,
} from "@/db/schema";
import {
  activeGoalsMonthlyPlanUsd,
  contributionsPlanFactUsd,
  totalExpensesUsd,
  totalIncomesUsd,
  totalPlannedPlanOnlyUsd,
} from "./aggregate";
import { usdEquivalent, goalTargetUsd } from "./format";

export interface MonthDataset {
  month: Month;
  expenses: DailyExpense[];
  incomes: Income[];
  contributions: GoalContribution[];
  planUsd: number;
}

export interface MonthAgg {
  month: Month;
  label: string;
  earnedUsd: number;
  spentUsd: number;
  contribFactUsd: number;
  savingsRate: number;
  net: number;
  planUsd: number;
  goalsPlanUsd: number;
  needToEarnUsd: number;
}

export function aggregateMonth(
  ds: MonthDataset,
  goals: SavingsGoal[],
): MonthAgg {
  const rate = ds.month.exchangeRate;
  const earned = totalIncomesUsd(ds.incomes, rate);
  const spent = totalExpensesUsd(ds.expenses, rate);
  const { factUsd: contribFact } = contributionsPlanFactUsd(
    ds.contributions,
    goals,
    rate,
  );
  const goalsPlan = activeGoalsMonthlyPlanUsd(goals, rate);
  const need = ds.planUsd + goalsPlan;
  const label = `${ds.month.year}-${String(ds.month.month).padStart(2, "0")}`;
  const savingsRate = earned > 0 ? contribFact / earned : 0;
  return {
    month: ds.month,
    label,
    earnedUsd: earned,
    spentUsd: spent,
    contribFactUsd: contribFact,
    savingsRate,
    net: earned - spent - contribFact,
    planUsd: ds.planUsd,
    goalsPlanUsd: goalsPlan,
    needToEarnUsd: need,
  };
}

export interface CategoryMonthCell {
  categoryId: number;
  monthLabel: string;
  totalUsd: number;
}

export function categoryCohort(
  datasets: MonthDataset[],
  categories: Category[],
): { categoryId: number; categoryName: string; icon: string | null; totalsByMonth: Map<string, number> }[] {
  const catMap = new Map(categories.map((c) => [c.id, c] as const));
  const perCat = new Map<
    number,
    { total: number; totalsByMonth: Map<string, number> }
  >();
  for (const ds of datasets) {
    const rate = ds.month.exchangeRate;
    const label = `${ds.month.year}-${String(ds.month.month).padStart(2, "0")}`;
    for (const e of ds.expenses) {
      const usd = usdEquivalent(e.amountUsd, e.amountUzs, rate);
      let bucket = perCat.get(e.categoryId);
      if (!bucket) {
        bucket = { total: 0, totalsByMonth: new Map() };
        perCat.set(e.categoryId, bucket);
      }
      bucket.total += usd;
      bucket.totalsByMonth.set(
        label,
        (bucket.totalsByMonth.get(label) ?? 0) + usd,
      );
    }
  }
  return [...perCat.entries()]
    .map(([id, v]) => {
      const cat = catMap.get(id);
      return {
        categoryId: id,
        categoryName: cat?.name ?? "Прочее",
        icon: cat?.icon ?? null,
        totalsByMonth: v.totalsByMonth,
      };
    })
    .sort((a, b) => {
      const sumA = [...a.totalsByMonth.values()].reduce((s, x) => s + x, 0);
      const sumB = [...b.totalsByMonth.values()].reduce((s, x) => s + x, 0);
      return sumB - sumA;
    });
}

export interface WeekdayBreakdown {
  weekday: number; // 0..6, 0 = Sunday
  label: string;
  totalUsd: number;
  countDays: number;
}

const weekdayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function weekdayBreakdown(
  datasets: MonthDataset[],
): WeekdayBreakdown[] {
  const totals = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);
  const seenDays = new Set<string>();
  for (const ds of datasets) {
    const rate = ds.month.exchangeRate;
    for (const e of ds.expenses) {
      const d = new Date(e.date);
      const w = d.getDay();
      totals[w] += usdEquivalent(e.amountUsd, e.amountUzs, rate);
      const key = `${w}-${e.date}`;
      if (!seenDays.has(key)) {
        seenDays.add(key);
        dayCounts[w] += 1;
      }
    }
  }
  const result: WeekdayBreakdown[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const w = i % 7; // start with Monday
    result.push({
      weekday: w,
      label: weekdayLabels[w],
      totalUsd: totals[w],
      countDays: Math.max(1, dayCounts[w]),
    });
  }
  return result;
}

export interface HeatmapCell {
  date: string;
  totalUsd: number;
  weekday: number;
  weekOfYear: number;
}

export function heatmapData(datasets: MonthDataset[]): HeatmapCell[] {
  const byDate = new Map<string, number>();
  for (const ds of datasets) {
    const rate = ds.month.exchangeRate;
    for (const e of ds.expenses) {
      const usd = usdEquivalent(e.amountUsd, e.amountUzs, rate);
      byDate.set(e.date, (byDate.get(e.date) ?? 0) + usd);
    }
  }
  return [...byDate.entries()]
    .map(([date, total]) => {
      const d = new Date(date);
      return {
        date,
        totalUsd: total,
        weekday: d.getDay(),
        weekOfYear: weekOfYear(d),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function weekOfYear(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = Math.floor(
    (d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.floor((diff + startOfYear.getDay()) / 7);
}

export interface FinancialKpis {
  savingsRateAvg: number;
  savingsRateLatest: number;
  fixedRatioAvg: number;
  runwayMonths: number;
  burnRateForecastUsd: number;
  monthElapsedDays: number;
  monthTotalDays: number;
}

export function financialKpis(
  aggs: MonthAgg[],
  current: MonthAgg | undefined,
  totalSavedUsd: number,
): FinancialKpis {
  const savingsRates = aggs.filter((a) => a.earnedUsd > 0).map((a) => a.savingsRate);
  const savingsRateAvg =
    savingsRates.length > 0
      ? savingsRates.reduce((s, x) => s + x, 0) / savingsRates.length
      : 0;
  const savingsRateLatest = current?.savingsRate ?? 0;

  const fixedRatios = aggs
    .filter((a) => a.earnedUsd > 0)
    .map((a) => (a.planUsd + a.goalsPlanUsd) / Math.max(1, a.earnedUsd));
  const fixedRatioAvg =
    fixedRatios.length > 0
      ? fixedRatios.reduce((s, x) => s + x, 0) / fixedRatios.length
      : 0;

  const avgSpent =
    aggs.length > 0
      ? aggs.reduce((s, a) => s + a.spentUsd, 0) / aggs.length
      : 0;
  const runwayMonths = avgSpent > 0 ? totalSavedUsd / avgSpent : 0;

  const now = new Date();
  const monthTotalDays = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const monthElapsedDays = now.getDate();
  const burnRateForecastUsd = current
    ? (current.spentUsd / Math.max(1, monthElapsedDays)) * monthTotalDays
    : 0;

  return {
    savingsRateAvg,
    savingsRateLatest,
    fixedRatioAvg,
    runwayMonths,
    burnRateForecastUsd,
    monthElapsedDays,
    monthTotalDays,
  };
}

export interface GoalEta {
  goalId: number;
  title: string;
  targetUsd: number;
  savedUsd: number;
  remainingUsd: number;
  perMonthUsd: number;
  monthsToGo: number | null;
}

export function goalEtas(
  goals: SavingsGoal[],
  contribs: GoalContribution[],
  aggs: MonthAgg[],
  rate: number,
): GoalEta[] {
  const factByGoal = new Map<number, number>();
  for (const c of contribs) {
    factByGoal.set(
      c.goalId,
      (factByGoal.get(c.goalId) ?? 0) + c.factAmount,
    );
  }
  const avgContribPerMonth =
    aggs.length > 0
      ? aggs.reduce((s, a) => s + a.contribFactUsd, 0) / aggs.length
      : 0;
  return goals
    .filter((g) => g.status === "Активна")
    .map((g) => {
      const target = goalTargetUsd(g.currency, g.targetAmount, rate);
      const saved = goalTargetUsd(g.currency, factByGoal.get(g.id) ?? 0, rate);
      const remaining = Math.max(0, target - saved);
      const perMonth = Math.max(
        goalTargetUsd(g.currency, g.monthlyContribution, rate),
        avgContribPerMonth / Math.max(1, goals.filter((x) => x.status === "Активна").length),
      );
      const monthsToGo =
        perMonth > 0 ? Math.ceil(remaining / perMonth) : null;
      return {
        goalId: g.id,
        title: g.title,
        targetUsd: target,
        savedUsd: saved,
        remainingUsd: remaining,
        perMonthUsd: perMonth,
        monthsToGo,
      };
    });
}

export interface Insight {
  kind: "positive" | "neutral" | "warning" | "critical";
  text: string;
}

const insightMonthLabelRu = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function formatUsdShort(v: number): string {
  const sign = v < 0 ? "−" : "";
  return `${sign}$${Math.round(Math.abs(v)).toLocaleString("ru-RU")}`;
}

export function generateInsights(
  aggs: MonthAgg[],
  current: MonthAgg | undefined,
  catCohort: ReturnType<typeof categoryCohort>,
  kpis: FinancialKpis,
): Insight[] {
  const out: Insight[] = [];
  if (!current || aggs.length === 0) return out;

  const other = aggs.filter((a) => a.label !== current.label);
  const otherAvgSpent =
    other.length > 0
      ? other.reduce((s, a) => s + a.spentUsd, 0) / other.length
      : 0;

  if (otherAvgSpent > 0) {
    const projected = kpis.burnRateForecastUsd;
    const delta = projected - otherAvgSpent;
    if (Math.abs(delta) > otherAvgSpent * 0.1) {
      out.push({
        kind: delta > 0 ? "warning" : "positive",
        text:
          delta > 0
            ? `При текущем темпе в этом месяце потратите ${formatUsdShort(projected)} — на ${pct(delta / otherAvgSpent)} больше среднего за прошлые ${other.length} мес.`
            : `Идёте бережливее обычного: прогноз ${formatUsdShort(projected)}, среднее за прошлые ${other.length} мес. ${formatUsdShort(otherAvgSpent)}.`,
      });
    }
  }

  if (current.earnedUsd > 0 && current.spentUsd > current.earnedUsd) {
    out.push({
      kind: "critical",
      text: `В этом месяце потратили больше, чем заработали (${formatUsdShort(current.spentUsd - current.earnedUsd)} перерасход). Проверьте плановые платежи и категории с ростом.`,
    });
  }

  if (kpis.savingsRateLatest > 0.2) {
    out.push({
      kind: "positive",
      text: `Сберегательный коэффициент ${pct(kpis.savingsRateLatest)} — выше нормы 20%. Молодцы!`,
    });
  } else if (kpis.savingsRateAvg < 0.1 && current.earnedUsd > 0) {
    out.push({
      kind: "warning",
      text: `Сбережения — только ${pct(kpis.savingsRateLatest)} от дохода (норма 20%+). Проверьте активные цели или размер месячных взносов.`,
    });
  }

  const topGrowing = catCohort
    .map((c) => {
      const totals = [...c.totalsByMonth.values()];
      if (totals.length < 2) return null;
      const first = totals[0];
      const last = totals[totals.length - 1];
      if (first <= 0) return null;
      return { name: c.categoryName, growth: (last - first) / first, last };
    })
    .filter((x): x is { name: string; growth: number; last: number } => !!x)
    .filter((x) => x.growth > 0.25)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 1);
  if (topGrowing[0]) {
    const t = topGrowing[0];
    out.push({
      kind: "warning",
      text: `Категория «${t.name}» выросла на ${pct(t.growth)} за наблюдаемый период (${formatUsdShort(t.last)} в этом месяце).`,
    });
  }

  const monthName = insightMonthLabelRu[current.month.month - 1] ?? "";
  if (
    current.needToEarnUsd > 0 &&
    current.earnedUsd < current.needToEarnUsd &&
    kpis.monthElapsedDays >= 25
  ) {
    const need = current.needToEarnUsd - current.earnedUsd;
    out.push({
      kind: "warning",
      text: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} завершается: до плана дохода не хватает ${formatUsdShort(need)}.`,
    });
  }

  if (kpis.fixedRatioAvg > 0.7 && kpis.fixedRatioAvg <= 1.5) {
    out.push({
      kind: "neutral",
      text: `Обязательные платежи + цели «съедают» в среднем ${pct(kpis.fixedRatioAvg)} дохода. Осторожно с новыми фиксированными обязательствами.`,
    });
  }

  return out.slice(0, 6);
}
