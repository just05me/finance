import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";
import { OwnerFilter } from "@/components/owner-filter";
import { resolveOwnerView } from "@/lib/owner-view";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  listCategories,
  listContributionsByMonth,
  listDailyExpenses,
  listGoals,
  listIncomeCategories,
  listIncomes,
  listMonths,
  listPlannedPayments,
  listUsers,
} from "@/db/queries";
import { getOrCreateCurrentMonth } from "@/lib/month-service";
import {
  expensesByCategory,
  incomesByCategory,
  summarizeMonth,
} from "@/lib/aggregate";
import {
  formatUsd,
  monthGenitive,
  monthLabel,
  relativeTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { ownerFromUserName } from "@/lib/owner";

export const dynamic = "force-dynamic";

interface DashboardProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardProps): Promise<React.ReactElement> {
  const session = await requireUser();
  const sp = await searchParams;
  const view = resolveOwnerView(sp.view);
  const [users, categories, incomeCategories] = await Promise.all([
    listUsers(),
    listCategories(false),
    listIncomeCategories(false),
  ]);
  const month = await getOrCreateCurrentMonth(session.userId);
  const [expensesRaw, incomesRaw, plans, goals, contribs, allMonths] =
    await Promise.all([
      listDailyExpenses(month.id, {
        includePrivateOfUserId: session.userId,
      }),
      listIncomes(month.id),
      listPlannedPayments(month.id),
      listGoals(),
      listContributionsByMonth(month.id),
      listMonths(),
    ]);

  const filterRow = <T extends { createdByUserId: number }>(rows: T[]): T[] => {
    if (view === "all") return rows;
    if (view === "me")
      return rows.filter((r) => r.createdByUserId === session.userId);
    return rows.filter((r) => r.createdByUserId !== session.userId);
  };
  const expenses = filterRow(expensesRaw);
  const incomes = filterRow(incomesRaw);

  const summary = summarizeMonth({
    payments: plans,
    expenses,
    incomes,
    goals,
    contributions: contribs,
    rate: month.exchangeRate,
    monthYear: { year: month.year, month: month.month },
  });
  const earnedPct = summary.needToEarn
    ? Math.min(100, Math.round((summary.earned / summary.needToEarn) * 100))
    : 100;
  const spentPct = summary.earned
    ? Math.min(100, Math.round((summary.spent / summary.earned) * 100))
    : 0;

  const catExpenses = expensesByCategory(expenses, categories, month.exchangeRate);
  const catIncomes = incomesByCategory(incomes, incomeCategories, month.exchangeRate);

  const activeGoals = goals.filter((g) => g.status === "Активна");
  const totalSaved = contribs.reduce((s, c) => s + c.factAmount, 0);

  const recentActivity = [
    ...expenses.slice(0, 4).map((e) => ({
      kind: "expense" as const,
      id: e.id,
      date: e.date,
      when: e.createdAt,
      description: e.description || "Расход",
      owner: e.owner,
      usd: e.amountUsd + (month.exchangeRate ? e.amountUzs / month.exchangeRate : 0),
    })),
    ...incomes.slice(0, 4).map((i) => ({
      kind: "income" as const,
      id: i.id,
      date: i.date,
      when: i.createdAt,
      description: i.description || "Доход",
      owner: i.owner,
      usd: i.amountUsd + (month.exchangeRate ? i.amountUzs / month.exchangeRate : 0),
    })),
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 6);

  return (
    <AppShell
      userName={session.name}
      userOwner={ownerFromUserName(session.name)}
      categories={categories}
      incomeCategories={incomeCategories}
    >
      <AutoRefresh intervalMs={45000} />
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="caption text-muted-foreground">
              {relativeTime(month.createdAt)} · курс{" "}
              {month.exchangeRate.toLocaleString("ru-RU")} сум/$
            </div>
            <h1 className="display-2 mt-1">{monthLabel(month.year, month.month)}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {users.length > 1 ? <OwnerFilter /> : null}
            <Link
              href={`/months/${month.year}/${String(month.month).padStart(2, "0")}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3.5 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Открыть месяц <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="caption text-muted-foreground">
                  Прогресс месяца
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="display-1 num-tabular">
                    {formatUsd(summary.earned)}
                  </span>
                  <span className="body-sm text-muted-foreground">
                    {summary.needToEarn > 0
                      ? `из ${formatUsd(summary.needToEarn)}`
                      : "план не задан"}
                  </span>
                </div>
              </div>
              {summary.needToEarn > 0 ? (
                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-[13px] font-semibold",
                    summary.earned >= summary.needToEarn
                      ? "bg-success/12 text-success"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {earnedPct}%
                </div>
              ) : (
                <Link
                  href="/goals"
                  className="rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary hover:bg-primary/20"
                >
                  Задать цели
                </Link>
              )}
            </div>
            <div className="mt-3">
              <Progress
                value={summary.needToEarn > 0 ? earnedPct : 0}
                tone={
                  summary.needToEarn === 0
                    ? "primary"
                    : summary.earned >= summary.needToEarn
                      ? "success"
                      : "primary"
                }
                height="lg"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
              {summary.needToEarn > 0 ? (
                <span>
                  Осталось заработать:{" "}
                  <span className="font-semibold text-foreground">
                    {formatUsd(summary.earnedRemaining)}
                  </span>
                </span>
              ) : (
                <span>
                  Добавьте плановые платежи и цели, чтобы увидеть, сколько
                  нужно заработать.
                </span>
              )}
              {summary.earned > 0 ? (
                <span>Потрачено {spentPct}% от заработанного</span>
              ) : null}
            </div>
          </CardContent>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/6 via-transparent to-transparent" />
        </Card>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Нужно заработать"
            value={formatUsd(summary.needToEarn)}
            hint="план + цели"
          />
          <StatCard
            label="Заработано"
            value={formatUsd(summary.earned)}
            tone={summary.earned >= summary.needToEarn ? "success" : "default"}
          />
          <StatCard
            label="Осталось заработать"
            value={formatUsd(summary.earnedRemaining)}
            tone={summary.earnedRemaining > 0 ? "warning" : "success"}
          />
          <StatCard
            label="Потрачено"
            value={formatUsd(summary.spent)}
            tone={summary.overspent ? "destructive" : "default"}
            hint={
              summary.overspent
                ? "Тратите больше, чем зарабатываете"
                : undefined
            }
          />
          <StatCard
            label="Свободно"
            value={formatUsd(summary.free)}
            tone={summary.freeNegative ? "destructive" : "success"}
            hint={
              summary.freeNegative
                ? "В минусе"
                : "Заработано − потрачено − цели"
            }
          />
        </section>

        {summary.overdueOnPlan ||
        summary.overdueOnContributions ||
        summary.overspent ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col gap-1.5 p-4">
              <div className="text-[13px] font-semibold uppercase tracking-wide text-destructive">
                Требует внимания
              </div>
              <ul className="body-sm space-y-1 text-foreground">
                {summary.overspent ? (
                  <li>
                    • Расходы превысили доходы на{" "}
                    <b>{formatUsd(Math.max(0, summary.spent - summary.earned))}</b>
                  </li>
                ) : null}
                {summary.overdueOnPlan ? (
                  <li>• Есть просроченные плановые платежи</li>
                ) : null}
                {summary.overdueOnContributions ? (
                  <li>
                    • Отстаём по взносам в цели на{" "}
                    <b>
                      {formatUsd(
                        Math.max(
                          0,
                          summary.contributionsPlan - summary.contributionsFact,
                        ),
                      )}
                    </b>
                  </li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" /> Доходы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {catIncomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Доходов ещё нет.</p>
              ) : (
                catIncomes.slice(0, 6).map((c) => (
                  <CategoryRow
                    key={c.categoryId}
                    icon={c.categoryIcon}
                    name={c.categoryName}
                    value={c.totalUsd}
                    total={summary.earned}
                    tone="success"
                  />
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" /> Расходы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {catExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Расходов ещё нет.
                </p>
              ) : (
                catExpenses.slice(0, 6).map((c) => (
                  <CategoryRow
                    key={c.categoryId}
                    icon={c.categoryIcon}
                    name={c.categoryName}
                    value={c.totalUsd}
                    total={summary.spent}
                    tone="primary"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Цели накоплений</CardTitle>
              <span className="text-[12px] text-muted-foreground">
                Всего накоплено {formatUsd(totalSaved)}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Активных целей нет.{" "}
                  <Link
                    href="/goals"
                    className="font-semibold text-primary hover:underline"
                  >
                    Создать
                  </Link>
                </p>
              ) : (
                activeGoals.map((g) => {
                  const monthContrib = contribs.find(
                    (c) => c.goalId === g.id,
                  );
                  const plan = monthContrib?.planAmount ?? g.monthlyContribution;
                  const fact = monthContrib?.factAmount ?? 0;
                  const missed = fact < plan - 0.01;
                  const goalPct =
                    plan > 0
                      ? Math.min(100, Math.round((fact / plan) * 100))
                      : 0;
                  return (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{g.title}</span>
                        <span
                          className={cn(
                            "text-[13px] num-tabular",
                            missed ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {formatUsd(fact)} / {formatUsd(plan)}
                        </span>
                      </div>
                      <Progress
                        value={goalPct}
                        tone={missed ? "destructive" : "success"}
                        height="sm"
                      />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Недавняя активность</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока пусто. Добавьте первую запись через кнопку «+».
                </p>
              ) : (
                recentActivity.map((r) => (
                  <div
                    key={`${r.kind}-${r.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-1.5"
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        r.kind === "income"
                          ? "bg-success/12 text-success"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {r.kind === "income" ? "+" : "−"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">
                        {r.description}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {r.owner} · {relativeTime(r.when)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-[14px] num-tabular font-semibold",
                        r.kind === "income" ? "text-success" : "text-foreground",
                      )}
                    >
                      {r.kind === "income" ? "+" : ""}
                      {formatUsd(r.usd)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {allMonths.length > 1 ? (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="heading-lg">История</h2>
              <span className="text-[12px] text-muted-foreground">
                {allMonths.length} мес.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {allMonths.slice(0, 8).map((m) => (
                <Link
                  key={m.id}
                  href={`/months/${m.year}/${String(m.month).padStart(2, "0")}`}
                  className="group rounded-2xl border border-border/70 bg-card p-3 shadow-soft transition-colors hover:bg-accent"
                >
                  <div className="caption text-muted-foreground">
                    {monthGenitive(m.month)} {m.year}
                  </div>
                  <div className="mt-1 font-semibold">
                    {monthLabel(m.year, m.month)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {users.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{users.length} пользователя</Badge>
            <span className="text-[12px] text-muted-foreground">
              Данные общие между Ризо и Алиной.
            </span>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function CategoryRow({
  icon,
  name,
  value,
  total,
  tone,
}: {
  icon: string | null;
  name: string;
  value: number;
  total: number;
  tone: "primary" | "success";
}): React.ReactElement {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[15px]">
        {icon ?? "•"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-medium">{name}</span>
          <span className="text-[13px] num-tabular text-muted-foreground">
            {formatUsd(value)}
          </span>
        </div>
        <div className="mt-1">
          <Progress value={pct} tone={tone} height="sm" />
        </div>
      </div>
    </div>
  );
}
