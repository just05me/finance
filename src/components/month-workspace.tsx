"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/toast-provider";
import type {
  Category,
  DailyExpense,
  GoalContribution,
  Income,
  IncomeCategory,
  Month,
  Owner,
  PlannedPayment,
  SavingsGoal,
  User,
} from "@/db/schema";
import {
  formatDateShort,
  formatUsd,
  monthLabel,
  plannedUsdEquivalent,
  relativeTime,
  usdEquivalent,
} from "@/lib/format";
import { needToEarnUsd, summarizeMonth } from "@/lib/aggregate";
import { cn } from "@/lib/utils";

type Tab = "overview" | "expenses" | "incomes" | "planned";

const owners: Owner[] = ["Ризо", "Алина", "Семейное"];

interface Props {
  currentUserId: number;
  month: Month;
  categories: Category[];
  incomeCategories: IncomeCategory[];
  initialPlannedPayments: PlannedPayment[];
  initialDailyExpenses: DailyExpense[];
  initialIncomes: Income[];
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  users: User[];
}

export function MonthWorkspace(props: Props): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const {
    currentUserId,
    month,
    categories,
    incomeCategories,
    initialPlannedPayments,
    initialDailyExpenses,
    initialIncomes,
    goals,
    contributions,
    users,
  } = props;

  const [tab, setTab] = React.useState<Tab>("overview");
  const [rate, setRate] = React.useState(month.exchangeRate);
  const [plans, setPlans] = React.useState(initialPlannedPayments);
  const [expenses, setExpenses] = React.useState(initialDailyExpenses);
  const [incomes, setIncomes] = React.useState(initialIncomes);
  const [savingRate, setSavingRate] = React.useState(false);

  const summary = React.useMemo(
    () =>
      summarizeMonth({
        payments: plans,
        expenses,
        incomes,
        goals,
        contributions,
        rate,
        monthYear: { year: month.year, month: month.month },
      }),
    [plans, expenses, incomes, goals, contributions, rate, month],
  );

  async function saveRate(): Promise<void> {
    setSavingRate(true);
    try {
      const res = await fetch(`/api/months/${month.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRate: rate }),
      });
      if (!res.ok) {
        toast.show("Не удалось сохранить курс", { kind: "error" });
        return;
      }
      toast.show("Курс обновлён", { kind: "success" });
      router.refresh();
    } finally {
      setSavingRate(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="caption text-muted-foreground">
            Обновлено {relativeTime(month.createdAt)}
          </div>
          <h1 className="display-2 mt-1">
            {monthLabel(month.year, month.month)}
          </h1>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label>Курс, сум/$</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-28 text-right"
              />
              <Button
                type="button"
                size="sm"
                variant="soft"
                onClick={saveRate}
                disabled={savingRate || rate === month.exchangeRate}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard
          label="Нужно"
          value={formatUsd(summary.needToEarn)}
          hint="план + цели"
        />
        <StatCard
          label="Заработано"
          value={formatUsd(summary.earned)}
          tone={
            summary.earned >= summary.needToEarn ? "success" : "default"
          }
        />
        <StatCard
          label="Потрачено"
          value={formatUsd(summary.spent)}
          tone={summary.overspent ? "destructive" : "default"}
        />
        <StatCard
          label="Свободно"
          value={formatUsd(summary.free)}
          tone={summary.freeNegative ? "destructive" : "success"}
        />
      </section>

      <Segmented
        value={tab}
        onChange={setTab}
        className="self-start"
        options={[
          { value: "overview", label: "Обзор" },
          { value: "expenses", label: `Расходы (${expenses.length})` },
          { value: "incomes", label: `Доходы (${incomes.length})` },
          { value: "planned", label: `План (${plans.length})` },
        ]}
        ariaLabel="Раздел месяца"
      />

      {tab === "overview" ? (
        <OverviewTab
          month={month}
          summary={summary}
          goals={goals}
          contributions={contributions}
          rate={rate}
        />
      ) : null}

      {tab === "expenses" ? (
        <EntryList
          kind="expense"
          rows={expenses}
          rate={rate}
          categoryLookup={new Map(categories.map((c) => [c.id, c] as const))}
          userLookup={new Map(users.map((u) => [u.id, u] as const))}
          currentUserId={currentUserId}
          onDelete={async (id) => {
            const prev = expenses;
            setExpenses((p) => p.filter((e) => e.id !== id));
            const res = await fetch(`/api/daily-expenses/${id}`, {
              method: "DELETE",
            });
            if (!res.ok) {
              setExpenses(prev);
              toast.show("Не удалось удалить", { kind: "error" });
              return;
            }
            toast.show("Удалено", {
              kind: "success",
              action: {
                label: "Восстановить",
                onAction: () => router.refresh(),
              },
            });
          }}
        />
      ) : null}

      {tab === "incomes" ? (
        <EntryList
          kind="income"
          rows={incomes}
          rate={rate}
          categoryLookup={
            new Map(incomeCategories.map((c) => [c.id, c] as const))
          }
          userLookup={new Map(users.map((u) => [u.id, u] as const))}
          currentUserId={currentUserId}
          onDelete={async (id) => {
            const prev = incomes;
            setIncomes((p) => p.filter((e) => e.id !== id));
            const res = await fetch(`/api/incomes/${id}`, {
              method: "DELETE",
            });
            if (!res.ok) {
              setIncomes(prev);
              toast.show("Не удалось удалить", { kind: "error" });
              return;
            }
            toast.show("Удалено", { kind: "success" });
          }}
        />
      ) : null}

      {tab === "planned" ? (
        <PlannedList
          month={month}
          plans={plans}
          rate={rate}
          onPlansChange={setPlans}
        />
      ) : null}
    </div>
  );
}

function OverviewTab({
  month,
  summary,
  goals,
  contributions,
  rate,
}: {
  month: Month;
  summary: ReturnType<typeof summarizeMonth>;
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  rate: number;
}): React.ReactElement {
  const activeGoals = goals.filter((g) => g.status === "Активна");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Баланс месяца</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="План платежей" value={formatUsd(needToEarnUsd([], goals, rate))} muted />
          <Row
            label="План взносов"
            value={formatUsd(summary.contributionsPlan)}
          />
          <Row
            label="Факт взносов"
            value={formatUsd(summary.contributionsFact)}
            tone={
              summary.contributionsFact < summary.contributionsPlan
                ? "destructive"
                : "default"
            }
          />
          <div className="h-px bg-border/70" />
          <Row
            label="Всего заработано"
            value={formatUsd(summary.earned)}
            tone="success"
          />
          <Row
            label="Всего потрачено"
            value={formatUsd(summary.spent)}
            tone="destructive"
          />
          <Row
            label="Свободно"
            value={formatUsd(summary.free)}
            tone={summary.freeNegative ? "destructive" : "default"}
            bold
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Цели этого месяца</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Активных целей нет.</p>
          ) : (
            activeGoals.map((g) => {
              const c = contributions.find((x) => x.goalId === g.id);
              const plan = c?.planAmount ?? g.monthlyContribution;
              const fact = c?.factAmount ?? 0;
              const missed = fact < plan - 0.01;
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{g.title}</div>
                    <div className="text-[12px] text-muted-foreground">
                      Цель: {formatUsd(g.targetAmount)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "num-tabular text-right text-sm",
                      missed ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    <div>
                      <b className="text-foreground">{formatUsd(fact)}</b> /{" "}
                      {formatUsd(plan)}
                    </div>
                    {missed ? (
                      <div className="text-[12px] text-destructive">
                        отстаём на{" "}
                        {formatUsd(Math.max(0, plan - fact))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  muted,
  bold,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive";
  muted?: boolean;
  bold?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn(muted ? "text-muted-foreground" : "")}>{label}</span>
      <span
        className={cn(
          "num-tabular",
          bold && "font-semibold",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function EntryList<
  T extends {
    id: number;
    date: string;
    description: string;
    amountUsd: number;
    amountUzs: number;
    owner: Owner;
    createdAt: Date | string;
    createdByUserId: number;
  } & (
    | { categoryId: number; incomeCategoryId?: never; isPrivate?: boolean }
    | { incomeCategoryId: number; categoryId?: never; isPrivate?: never }
  ),
>({
  kind,
  rows,
  rate,
  categoryLookup,
  userLookup,
  onDelete,
  currentUserId,
}: {
  kind: "expense" | "income";
  rows: T[];
  rate: number;
  categoryLookup: Map<number, { name: string; icon: string | null }>;
  userLookup: Map<number, { name: string }>;
  onDelete: (id: number) => Promise<void> | void;
  currentUserId: number;
}): React.ReactElement {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Пока пусто. Нажмите «+» внизу, чтобы добавить запись.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const catId =
          "categoryId" in row && row.categoryId
            ? row.categoryId
            : row.incomeCategoryId;
        const cat = catId ? categoryLookup.get(catId) : undefined;
        const user = userLookup.get(row.createdByUserId);
        const usd = usdEquivalent(row.amountUsd, row.amountUzs, rate);
        const isPrivate =
          "isPrivate" in row && (row as { isPrivate?: boolean }).isPrivate;
        return (
          <motion.div
            key={row.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 40,
              mass: 0.6,
            }}
            className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-soft"
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full text-base",
                kind === "income"
                  ? "bg-success/12 text-success"
                  : "bg-muted text-foreground",
              )}
            >
              {cat?.icon ?? (kind === "income" ? "+" : "•")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <div className="truncate text-[14px] font-medium">
                  {row.description || cat?.name || "—"}
                </div>
                {isPrivate ? (
                  <Badge variant="muted" className="text-[10px]">
                    личное
                  </Badge>
                ) : null}
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {cat?.name ? `${cat.name} · ` : ""}
                {row.owner} · {formatDateShort(row.date)}
                {user
                  ? ` · ${user.name}${
                      row.createdByUserId === currentUserId ? " (вы)" : ""
                    }`
                  : ""}
              </div>
            </div>
            <div
              className={cn(
                "num-tabular text-right text-[15px] font-semibold",
                kind === "income" ? "text-success" : "text-foreground",
              )}
            >
              {kind === "income" ? "+" : ""}
              {formatUsd(usd)}
              {row.amountUzs > 0 && row.amountUsd === 0 ? (
                <div className="text-[11px] font-normal text-muted-foreground">
                  {row.amountUzs.toLocaleString("ru-RU")} сум
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDelete(row.id)}
              aria-label="Удалить"
              className="rounded-full p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 sm:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

function PlannedList({
  month,
  plans,
  rate,
  onPlansChange,
}: {
  month: Month;
  plans: PlannedPayment[];
  rate: number;
  onPlansChange: (v: PlannedPayment[]) => void;
}): React.ReactElement {
  const toast = useToast();
  const [busyId, setBusyId] = React.useState<number | null>(null);

  async function patch(id: number, patch: Partial<PlannedPayment>): Promise<void> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/planned-payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        toast.show("Не удалось сохранить", { kind: "error" });
        return;
      }
      const data = (await res.json()) as { plannedPayment: PlannedPayment };
      onPlansChange(
        plans.map((p) => (p.id === id ? data.plannedPayment : p)),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function add(): Promise<void> {
    const res = await fetch(`/api/planned-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthId: month.id,
        title: "Новая статья",
        currency: "USD",
        planAmount: 0,
        paid: false,
        owner: "Семейное",
        sortOrder: plans.length,
      }),
    });
    if (!res.ok) {
      toast.show("Не удалось добавить", { kind: "error" });
      return;
    }
    const data = (await res.json()) as { plannedPayment: PlannedPayment };
    onPlansChange([...plans, data.plannedPayment]);
  }

  async function remove(id: number): Promise<void> {
    const prev = plans;
    onPlansChange(plans.filter((p) => p.id !== id));
    const res = await fetch(`/api/planned-payments/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      onPlansChange(prev);
      toast.show("Не удалось удалить", { kind: "error" });
    } else {
      toast.show("План удалён");
    }
  }

  const totalPlanUsd = plans.reduce(
    (s, p) => s + plannedUsdEquivalent(p.currency, p.planAmount, null, rate),
    0,
  );
  const totalFactUsd = plans.reduce(
    (s, p) =>
      s +
      plannedUsdEquivalent(p.currency, p.planAmount, p.factAmount, rate),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-[13px] text-muted-foreground">
          <span>
            План: <b className="text-foreground">{formatUsd(totalPlanUsd)}</b>
          </span>
          <span>
            Факт: <b className="text-foreground">{formatUsd(totalFactUsd)}</b>
          </span>
        </div>
        <Button size="sm" onClick={add}>
          Добавить статью
        </Button>
      </div>
      <div className="space-y-2">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Плановых платежей нет.
            </CardContent>
          </Card>
        ) : (
          plans.map((p) => (
            <PlannedRow
              key={p.id}
              plan={p}
              busy={busyId === p.id}
              onPatch={(patch) => patch && void patch}
              onSave={(patch) => patch && void 0}
              onTogglePaid={() => patch(p.id, { paid: !p.paid })}
              onUpdateTitle={(v) =>
                v.trim() && v !== p.title
                  ? patch(p.id, { title: v.trim() })
                  : undefined
              }
              onUpdatePlan={(v) =>
                Number.isFinite(v) && v !== p.planAmount
                  ? patch(p.id, { planAmount: v })
                  : undefined
              }
              onUpdateFact={(v) =>
                (v === null || Number.isFinite(v)) && v !== p.factAmount
                  ? patch(p.id, { factAmount: v })
                  : undefined
              }
              onUpdateCurrency={(v) => patch(p.id, { currency: v })}
              onUpdateOwner={(v) => patch(p.id, { owner: v })}
              onUpdateNote={(v) => patch(p.id, { note: v || null })}
              onUpdateDueDay={(v) => patch(p.id, { dueDay: v })}
              onDelete={() => remove(p.id)}
              rate={rate}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PlannedRow({
  plan,
  busy,
  onTogglePaid,
  onUpdateTitle,
  onUpdatePlan,
  onUpdateFact,
  onUpdateCurrency,
  onUpdateOwner,
  onUpdateNote,
  onUpdateDueDay,
  onDelete,
  rate,
}: {
  plan: PlannedPayment;
  busy: boolean;
  onPatch?: (v: Partial<PlannedPayment>) => void;
  onSave?: (v: Partial<PlannedPayment>) => void;
  onTogglePaid: () => void;
  onUpdateTitle: (v: string) => void;
  onUpdatePlan: (v: number) => void;
  onUpdateFact: (v: number | null) => void;
  onUpdateCurrency: (v: "USD" | "UZS") => void;
  onUpdateOwner: (v: Owner) => void;
  onUpdateNote: (v: string | null) => void;
  onUpdateDueDay: (v: number | null) => void;
  onDelete: () => void;
  rate: number;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const usdEq = plannedUsdEquivalent(
    plan.currency,
    plan.planAmount,
    plan.factAmount,
    rate,
  );
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.6 }}
      className={cn(
        "rounded-2xl border bg-card p-3 shadow-soft transition-colors",
        plan.paid
          ? "border-success/40"
          : plan.dueDay
            ? "border-border/60"
            : "border-border/60",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onTogglePaid}
          aria-label={plan.paid ? "Снять отметку" : "Отметить оплаченным"}
          disabled={busy}
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            plan.paid
              ? "bg-success/12 text-success"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          {plan.paid ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <Input
            defaultValue={plan.title}
            onBlur={(e) => onUpdateTitle(e.target.value)}
            disabled={busy}
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-8 font-medium text-[15px]"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
            <span>{plan.owner}</span>
            {plan.dueDay ? (
              <>
                <span aria-hidden>·</span>
                <span>до {plan.dueDay} числа</span>
              </>
            ) : null}
            <button
              type="button"
              className="ml-auto rounded-full px-2 py-0.5 text-[12px] font-medium text-primary hover:bg-primary/10"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Скрыть" : "Детали"}
            </button>
          </div>
        </div>
        <div className="text-right">
          <div className="num-tabular text-[15px] font-semibold">
            {formatUsd(usdEq)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {plan.currency === "USD"
              ? `$${plan.planAmount}`
              : `${plan.planAmount.toLocaleString("ru-RU")} сум`}
          </div>
        </div>
      </div>
      {open ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2.5 sm:grid-cols-4">
          <Field label="Валюта">
            <Select
              value={plan.currency}
              onChange={(e) =>
                onUpdateCurrency(e.target.value as "USD" | "UZS")
              }
              disabled={busy}
            >
              <option value="USD">USD</option>
              <option value="UZS">UZS</option>
            </Select>
          </Field>
          <Field label="Кто">
            <Select
              value={plan.owner}
              onChange={(e) => onUpdateOwner(e.target.value as Owner)}
              disabled={busy}
            >
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="План">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              defaultValue={plan.planAmount}
              onBlur={(e) => onUpdatePlan(Number(e.target.value))}
              disabled={busy}
              className="text-right"
            />
          </Field>
          <Field label="Факт">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              defaultValue={plan.factAmount ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const num = v === "" ? null : Number(v);
                onUpdateFact(num);
              }}
              disabled={busy}
              className="text-right"
            />
          </Field>
          <Field label="До какого числа">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              defaultValue={plan.dueDay ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                onUpdateDueDay(v === "" ? null : Number(v));
              }}
              disabled={busy}
              placeholder="—"
              className="text-center"
            />
          </Field>
          <Field label="Заметка" className="sm:col-span-3">
            <Input
              defaultValue={plan.note ?? ""}
              onBlur={(e) => onUpdateNote(e.target.value.trim() || null)}
              disabled={busy}
              placeholder="—"
            />
          </Field>
          <div className="sm:col-span-4 flex justify-end pt-1">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Удалить статью
            </button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
