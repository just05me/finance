"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import type {
  Category,
  IncomeCategory,
  SavingsGoal,
} from "@/db/schema";
import type { MonthDataset } from "@/lib/analytics";
import {
  aggregateMonth,
  categoryCohort,
  financialKpis,
  generateInsights,
  goalEtas,
  heatmapData,
  weekdayBreakdown,
  type Insight,
} from "@/lib/analytics";
import {
  formatUsd,
  monthGenitive,
  monthLabel,
  shortMonthLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  datasets: MonthDataset[];
  categories: Category[];
  incomeCategories: IncomeCategory[];
  goals: SavingsGoal[];
  currentRate: number;
}

export function AnalyticsView({
  datasets,
  categories,
  goals,
  currentRate,
}: Props): React.ReactElement {
  const ordered = React.useMemo(
    () =>
      [...datasets].sort((a, b) =>
        a.month.year === b.month.year
          ? a.month.month - b.month.month
          : a.month.year - b.month.year,
      ),
    [datasets],
  );
  const aggs = React.useMemo(
    () => ordered.map((ds) => aggregateMonth(ds, goals)),
    [ordered, goals],
  );
  const current = aggs[aggs.length - 1];
  const cohort = React.useMemo(
    () => categoryCohort(ordered, categories),
    [ordered, categories],
  );
  const totalSaved = React.useMemo(
    () =>
      ordered.reduce(
        (s, ds) => s + ds.contributions.reduce((x, c) => x + c.factAmount, 0),
        0,
      ),
    [ordered],
  );
  const kpis = React.useMemo(
    () => financialKpis(aggs, current, totalSaved),
    [aggs, current, totalSaved],
  );
  const insights = React.useMemo(
    () => generateInsights(aggs, current, cohort, kpis),
    [aggs, current, cohort, kpis],
  );
  const etas = React.useMemo(
    () => goalEtas(goals, ordered.flatMap((d) => d.contributions), aggs, currentRate),
    [goals, ordered, aggs, currentRate],
  );
  const weekdays = React.useMemo(
    () => weekdayBreakdown(ordered),
    [ordered],
  );
  const heatmap = React.useMemo(() => heatmapData(ordered), [ordered]);

  const lineData = aggs.map((a) => ({
    label: `${shortMonthLabel(a.month.month).slice(0, 3)} ${String(a.month.year).slice(2)}`,
    Заработано: Math.round(a.earnedUsd),
    Потрачено: Math.round(a.spentUsd),
    Цели: Math.round(a.contribFactUsd),
  }));

  if (aggs.length === 0) {
    return <EmptyAnalytics />;
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="display-2">Аналитика</h1>
        <p className="body-sm text-muted-foreground">
          {aggs.length} мес. в наборе · инсайты, KPI, визуализации.
        </p>
      </header>

      {insights.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Что важного
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <InsightRow key={i} insight={ins} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard
          label="Savings Rate"
          value={`${Math.round(kpis.savingsRateLatest * 100)}%`}
          hint={`ср. ${Math.round(kpis.savingsRateAvg * 100)}% · норма 20%+`}
          tone={
            kpis.savingsRateLatest >= 0.2
              ? "success"
              : kpis.savingsRateLatest >= 0.1
                ? "warning"
                : "destructive"
          }
        />
        <StatCard
          label="Fixed ratio"
          value={`${Math.round(kpis.fixedRatioAvg * 100)}%`}
          hint="план + цели / доход"
          tone={kpis.fixedRatioAvg > 0.9 ? "warning" : "default"}
        />
        <StatCard
          label="Runway"
          value={`${kpis.runwayMonths.toFixed(1)} мес`}
          hint="если доход обнулится"
          tone={kpis.runwayMonths >= 6 ? "success" : "warning"}
        />
        <StatCard
          label="Burn forecast"
          value={formatUsd(kpis.burnRateForecastUsd)}
          hint={`на ${kpis.monthElapsedDays}/${kpis.monthTotalDays} день`}
          tone={
            current && kpis.burnRateForecastUsd > current.earnedUsd
              ? "destructive"
              : "default"
          }
        />
      </section>

      {etas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>ETA целей</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {etas.map((e) => (
              <div
                key={e.goalId}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.title}</div>
                  <div className="text-[12px] text-muted-foreground num-tabular">
                    {formatUsd(e.savedUsd)} / {formatUsd(e.targetUsd)} · план
                    {" "}
                    {formatUsd(e.perMonthUsd)}/мес
                  </div>
                </div>
                <div className="text-right text-sm num-tabular">
                  {e.monthsToGo === null
                    ? "план не задан"
                    : e.monthsToGo === 0
                      ? "цель достигнута"
                      : `~ ${e.monthsToGo} мес`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Заработано vs Потрачено vs Цели</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => `$${v}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Заработано"
                  stroke="hsl(var(--success))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Потрачено"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Цели"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  strokeDasharray="4 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Расходы по дням недели</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={weekdays} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `$${Math.round(v)}`}
                  />
                  <Bar dataKey="totalUsd" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                    {weekdays.map((w, i) => (
                      <Cell
                        key={i}
                        fill={
                          w.weekday === 0 || w.weekday === 6
                            ? "hsl(var(--warning))"
                            : "hsl(var(--primary))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Выходные помечены оранжевым.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Календарная тепловая карта</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapCalendar data={heatmap} />
          </CardContent>
        </Card>
      </div>

      {cohort.length > 0 && aggs.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Категории × месяц</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-max text-sm num-tabular">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1.5 text-left">Категория</th>
                  {aggs.map((a) => (
                    <th key={a.label} className="px-2 py-1.5 text-right">
                      {shortMonthLabel(a.month.month).slice(0, 3)}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-right">Итого</th>
                </tr>
              </thead>
              <tbody>
                {cohort.slice(0, 12).map((c) => {
                  const rowValues = aggs.map(
                    (a) => c.totalsByMonth.get(a.label) ?? 0,
                  );
                  const max = Math.max(...rowValues, 1);
                  const sum = rowValues.reduce((s, x) => s + x, 0);
                  return (
                    <tr key={c.categoryId} className="border-t border-border/50">
                      <td className="px-2 py-1.5">
                        <span className="mr-1">{c.icon ?? "•"}</span>
                        {c.categoryName}
                      </td>
                      {rowValues.map((v, i) => {
                        const intensity = v / max;
                        return (
                          <td
                            key={i}
                            className="px-2 py-1.5 text-right"
                            style={{
                              background:
                                v > 0
                                  ? `hsl(var(--primary) / ${0.05 + intensity * 0.25})`
                                  : undefined,
                            }}
                          >
                            {v > 0 ? formatUsd(v) : "—"}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-right font-semibold">
                        {formatUsd(sum)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }): React.ReactElement {
  const map: Record<
    Insight["kind"],
    { icon: React.ReactNode; bg: string; text: string }
  > = {
    positive: {
      icon: <TrendingUp className="h-4 w-4" />,
      bg: "bg-success/12",
      text: "text-success",
    },
    neutral: {
      icon: <Info className="h-4 w-4" />,
      bg: "bg-muted",
      text: "text-foreground",
    },
    warning: {
      icon: <ArrowUpRight className="h-4 w-4" />,
      bg: "bg-warning/12",
      text: "text-warning",
    },
    critical: {
      icon: <AlertTriangle className="h-4 w-4" />,
      bg: "bg-destructive/12",
      text: "text-destructive",
    },
  };
  const m = map[insight.kind];
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          m.bg,
          m.text,
        )}
      >
        {m.icon}
      </span>
      <p className="text-sm text-foreground">{insight.text}</p>
    </div>
  );
}

function HeatmapCalendar({
  data,
}: {
  data: ReturnType<typeof heatmapData>;
}): React.ReactElement {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Ещё нет расходов для карты.
      </p>
    );
  }
  const byDate = new Map(data.map((d) => [d.date, d] as const));
  const dates = data.map((d) => new Date(d.date));
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const totalDays = Math.max(
    1,
    Math.round((max.getTime() - min.getTime()) / 86400000) + 1,
  );
  const startOffset = min.getDay(); // 0=Sun
  const cellsBefore = startOffset;
  const cells: Array<{ date: string; total: number } | null> = [];
  for (let i = 0; i < cellsBefore; i += 1) cells.push(null);
  for (let i = 0; i < totalDays; i += 1) {
    const d = new Date(min.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, total: byDate.get(iso)?.totalUsd ?? 0 });
  }
  const maxTotal = Math.max(...data.map((d) => d.totalUsd), 1);
  return (
    <div className="space-y-2">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div key={i} className="aspect-square rounded-sm" />
          ) : (
            <div
              key={i}
              className="aspect-square rounded-sm border border-border/40"
              title={`${c.date}: ${formatUsd(c.total)}`}
              style={{
                background:
                  c.total > 0
                    ? `hsl(var(--primary) / ${0.15 + Math.min(0.75, c.total / maxTotal)})`
                    : "hsl(var(--muted) / 0.4)",
              }}
            />
          ),
        )}
      </div>
      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        <span>меньше</span>
        {[0.15, 0.35, 0.55, 0.75, 0.9].map((v) => (
          <span
            key={v}
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: `hsl(var(--primary) / ${v})` }}
          />
        ))}
        <span>больше</span>
      </div>
    </div>
  );
}

function EmptyAnalytics(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display-2">Аналитика</h1>
        <p className="body-sm text-muted-foreground">
          Инсайты, KPI и визуализации по всей истории.
        </p>
      </header>
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div className="mt-3 body-lg font-semibold">
            Данных ещё недостаточно
          </div>
          <p className="mt-1 mx-auto max-w-md text-sm text-muted-foreground">
            Добавьте несколько записей — расходы и доходы за пару месяцев — и
            аналитика оживёт: инсайты, KPI, тренды, тепловая карта, cohort-таблица.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
