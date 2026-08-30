"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CheckCircle2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/toast-provider";
import type {
  Currency,
  GoalContribution,
  GoalStatus,
  Month,
  SavingsGoal,
} from "@/db/schema";
import { formatUsd, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  months: Month[];
  currentMonthId: number;
}

export function GoalsView(props: Props): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [statusTab, setStatusTab] = React.useState<GoalStatus | "Все">(
    "Активна",
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavingsGoal | null>(null);

  const visible = React.useMemo(
    () =>
      statusTab === "Все"
        ? props.goals
        : props.goals.filter((g) => g.status === statusTab),
    [props.goals, statusTab],
  );

  const totalSavedByGoal = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const c of props.contributions) {
      m.set(c.goalId, (m.get(c.goalId) ?? 0) + c.factAmount);
    }
    return m;
  }, [props.contributions]);

  const monthById = React.useMemo(
    () => new Map(props.months.map((m) => [m.id, m] as const)),
    [props.months],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-2">Цели</h1>
          <p className="body-sm text-muted-foreground">
            Копим по месячному плану. Достижение цели закрывает её автоматически.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Новая цель
        </Button>
      </header>
      <Segmented
        value={statusTab}
        onChange={setStatusTab}
        className="self-start"
        options={[
          { value: "Активна", label: "Активные" },
          { value: "На паузе", label: "На паузе" },
          { value: "Завершена", label: "Завершены" },
          { value: "Все", label: "Все" },
        ]}
        ariaLabel="Фильтр статуса"
      />
      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="mt-3 body-lg font-semibold">Целей нет</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Добавьте первую цель — например, «Ноутбук $2000, копим $200 в месяц».
            </div>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              Создать цель
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {visible.map((g) => {
          const totalSaved = totalSavedByGoal.get(g.id) ?? 0;
          const pct =
            g.targetAmount > 0
              ? Math.min(100, Math.round((totalSaved / g.targetAmount) * 100))
              : 0;
          const monthsToGo =
            g.monthlyContribution > 0
              ? Math.max(
                  0,
                  Math.ceil((g.targetAmount - totalSaved) / g.monthlyContribution),
                )
              : null;
          const missing = Math.max(0, g.targetAmount - totalSaved);
          return (
            <Card key={g.id} className={cn(g.status !== "Активна" && "opacity-75")}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle>{g.title}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                    <StatusBadge status={g.status} />
                    <span aria-hidden>·</span>
                    <span>Цель {formatUsd(g.targetAmount)}</span>
                    <span aria-hidden>·</span>
                    <span>+{formatUsd(g.monthlyContribution)} / мес</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(g)}
                  aria-label="Изменить"
                  className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="body-sm text-muted-foreground">
                    Накоплено
                  </div>
                  <div className="num-tabular text-[15px] font-semibold">
                    {formatUsd(totalSaved)} / {formatUsd(g.targetAmount)} ({pct}%)
                  </div>
                </div>
                <Progress
                  value={pct}
                  tone={g.status === "Завершена" ? "success" : "primary"}
                  height="md"
                />
                <div className="grid grid-cols-2 gap-2 text-[12px] text-muted-foreground">
                  <div>
                    Осталось:{" "}
                    <b className="text-foreground num-tabular">
                      {formatUsd(missing)}
                    </b>
                  </div>
                  <div className="text-right">
                    {monthsToGo === null
                      ? "план не задан"
                      : monthsToGo === 0
                        ? "цель достигнута"
                        : `≈ ${monthsToGo} мес до финиша`}
                  </div>
                </div>
                <div>
                  <ContributionEditor
                    goal={g}
                    currentMonthId={props.currentMonthId}
                    contributions={props.contributions}
                    months={props.months}
                    monthById={monthById}
                    onChanged={() => router.refresh()}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <StatusActions goal={g} onChanged={() => router.refresh()} />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Удалить цель со всеми взносами?")) return;
                      const res = await fetch(`/api/goals/${g.id}`, {
                        method: "DELETE",
                      });
                      if (res.ok) {
                        toast.show("Цель удалена");
                        router.refresh();
                      } else {
                        toast.show("Не удалось удалить", { kind: "error" });
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Удалить
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <GoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => router.refresh()}
      />
      <GoalDialog
        open={!!editing}
        onOpenChange={(v) => (!v ? setEditing(null) : undefined)}
        goal={editing ?? undefined}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: GoalStatus;
}): React.ReactElement {
  const map: Record<GoalStatus, { bg: string; label: string }> = {
    Активна: { bg: "bg-primary/12 text-primary", label: "Активна" },
    "На паузе": { bg: "bg-warning/12 text-warning", label: "Пауза" },
    Завершена: { bg: "bg-success/12 text-success", label: "Завершена" },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        m.bg,
      )}
    >
      {m.label}
    </span>
  );
}

function StatusActions({
  goal,
  onChanged,
}: {
  goal: SavingsGoal;
  onChanged: () => void;
}): React.ReactElement {
  const toast = useToast();
  async function update(status: GoalStatus): Promise<void> {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.show("Статус обновлён");
      onChanged();
    } else {
      toast.show("Не удалось", { kind: "error" });
    }
  }
  if (goal.status === "Активна") {
    return (
      <>
        <button
          type="button"
          onClick={() => update("На паузе")}
          className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-3 py-1.5 text-[12.5px] font-semibold text-warning hover:bg-warning/20"
        >
          <Pause className="h-3.5 w-3.5" /> Пауза
        </button>
        <button
          type="button"
          onClick={() => update("Завершена")}
          className="inline-flex items-center gap-1 rounded-full bg-success/12 px-3 py-1.5 text-[12.5px] font-semibold text-success hover:bg-success/20"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Закрыть
        </button>
      </>
    );
  }
  return (
    <button
      type="button"
      onClick={() => update("Активна")}
      className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-3 py-1.5 text-[12.5px] font-semibold text-primary hover:bg-primary/20"
    >
      <Play className="h-3.5 w-3.5" /> Возобновить
    </button>
  );
}

function ContributionEditor({
  goal,
  currentMonthId,
  contributions,
  months,
  monthById,
  onChanged,
}: {
  goal: SavingsGoal;
  currentMonthId: number;
  contributions: GoalContribution[];
  months: Month[];
  monthById: Map<number, Month>;
  onChanged: () => void;
}): React.ReactElement {
  const toast = useToast();
  const [monthId, setMonthId] = React.useState<number>(currentMonthId);
  const [expanded, setExpanded] = React.useState(false);
  const current = contributions.find(
    (c) => c.goalId === goal.id && c.monthId === monthId,
  );
  const [factInput, setFactInput] = React.useState<string>(
    current?.factAmount ? String(current.factAmount) : "",
  );
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    setFactInput(current?.factAmount ? String(current.factAmount) : "");
  }, [current?.id, current?.factAmount, monthId]);

  const plan = current?.planAmount ?? goal.monthlyContribution;
  const fact = current?.factAmount ?? 0;
  const missed = fact < plan - 0.01;
  const targetMonth = monthById.get(monthId);

  async function save(): Promise<void> {
    const parsed = Number(factInput.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      toast.show("Некорректная сумма", { kind: "warning" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId,
          planAmount: plan,
          factAmount: parsed,
        }),
      });
      if (res.ok) {
        toast.show("Взнос сохранён", { kind: "success" });
        onChanged();
      } else {
        toast.show("Не удалось сохранить", { kind: "error" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-muted/40 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Взнос за месяц
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full px-2 py-0.5 text-[12px] font-semibold text-primary hover:bg-primary/10"
        >
          {expanded ? "Свернуть" : "Показать"}
        </button>
      </div>
      {expanded ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Месяц</Label>
              <Select
                value={monthId}
                onChange={(e) => setMonthId(Number(e.target.value))}
              >
                {months.map((m) => (
                  <option key={m.id} value={m.id}>
                    {monthLabel(m.year, m.month)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                Факт (план: {formatUsd(plan)})
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={factInput}
                onChange={(e) => setFactInput(e.target.value)}
                className={cn(
                  "text-right",
                  missed && "border-destructive/60",
                )}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] text-muted-foreground">
              {targetMonth
                ? monthLabel(targetMonth.year, targetMonth.month)
                : ""}
            </div>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-baseline justify-between">
          <span
            className={cn(
              "num-tabular text-[13px]",
              missed ? "text-destructive" : "text-foreground",
            )}
          >
            {formatUsd(fact)} <span className="text-muted-foreground">/ {formatUsd(plan)}</span>
          </span>
          <span className="text-[12px] text-muted-foreground">
            {targetMonth
              ? monthLabel(targetMonth.year, targetMonth.month)
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  onSaved,
  goal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  goal?: SavingsGoal;
}): React.ReactElement {
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [target, setTarget] = React.useState("");
  const [monthly, setMonthly] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? "");
    setCurrency(goal?.currency ?? "USD");
    setTarget(goal ? String(goal.targetAmount) : "");
    setMonthly(goal ? String(goal.monthlyContribution) : "");
  }, [open, goal]);
  async function save(): Promise<void> {
    const targetNum = Number(target);
    const monthlyNum = Number(monthly);
    if (!title.trim() || !Number.isFinite(targetNum) || targetNum <= 0) {
      toast.show("Заполните название и сумму", { kind: "warning" });
      return;
    }
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        currency,
        targetAmount: targetNum,
        monthlyContribution: Number.isFinite(monthlyNum) ? monthlyNum : 0,
      };
      const res = goal
        ? await fetch(`/api/goals/${goal.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/goals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (res.ok) {
        toast.show(goal ? "Цель обновлена" : "Цель создана", {
          kind: "success",
        });
        onSaved();
        onOpenChange(false);
      } else {
        toast.show("Не удалось сохранить", { kind: "error" });
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Редактировать цель" : "Новая цель"}
    >
      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <Label>Название</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Ноутбук"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Валюта</Label>
            <Segmented
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={[
                { value: "USD", label: "USD" },
                { value: "UZS", label: "UZS" },
              ]}
              ariaLabel="Валюта"
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label>Всего накопить</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="text-right"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Копим в месяц</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="text-right"
          />
          <p className="text-[12px] text-muted-foreground">
            Эта сумма попадёт в «Нужно заработать» каждый месяц.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Сохраняем…" : goal ? "Обновить" : "Создать"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
