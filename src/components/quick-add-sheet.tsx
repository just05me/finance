"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import type { Category, IncomeCategory, Owner } from "@/db/schema";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

type EntryKind = "expense" | "income";
type EntryCurrency = "UZS" | "USD";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  incomeCategories: IncomeCategory[];
  defaultOwner: Owner;
}

const owners: Owner[] = ["Ризо", "Алина", "Семейное"];

function useHaptic(): (kind?: "light" | "medium" | "success") => void {
  return React.useCallback((kind) => {
    if (typeof navigator === "undefined") return;
    if (!("vibrate" in navigator)) return;
    const pattern =
      kind === "success"
        ? [12, 40, 18]
        : kind === "medium"
          ? [15]
          : [8];
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }, []);
}

export function QuickAddSheet({
  open,
  onOpenChange,
  categories,
  incomeCategories,
  defaultOwner,
}: QuickAddSheetProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const haptic = useHaptic();
  const [kind, setKind] = React.useState<EntryKind>("expense");
  const [currency, setCurrency] = React.useState<EntryCurrency>("UZS");
  const [amount, setAmount] = React.useState<string>("");
  const [expenseCatId, setExpenseCatId] = React.useState<number>(
    categories[0]?.id ?? 0,
  );
  const [incomeCatId, setIncomeCatId] = React.useState<number>(
    incomeCategories[0]?.id ?? 0,
  );
  const [owner, setOwner] = React.useState<Owner>(defaultOwner);
  const [date, setDate] = React.useState<string>(todayIso());
  const [description, setDescription] = React.useState("");
  const [note, setNote] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const amountRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setDate(todayIso());
    setAmount("");
    setDescription("");
    setNote("");
    setIsPrivate(false);
    setShowMore(false);
    const t = setTimeout(() => amountRef.current?.focus(), 240);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (kind === "expense" && !categories.find((c) => c.id === expenseCatId)) {
      setExpenseCatId(categories[0]?.id ?? 0);
    }
    if (
      kind === "income" &&
      !incomeCategories.find((c) => c.id === incomeCatId)
    ) {
      setIncomeCatId(incomeCategories[0]?.id ?? 0);
    }
  }, [kind, categories, incomeCategories, expenseCatId, incomeCatId]);

  async function onSave(): Promise<void> {
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.show("Укажите сумму больше нуля", { kind: "warning" });
      amountRef.current?.focus();
      return;
    }
    setBusy(true);
    haptic("medium");
    try {
      const isExpense = kind === "expense";
      const url = isExpense ? "/api/daily-expenses" : "/api/incomes";
      const body = isExpense
        ? {
            date,
            categoryId: expenseCatId,
            description: description.trim(),
            amountUsd: currency === "USD" ? parsed : 0,
            amountUzs: currency === "UZS" ? parsed : 0,
            owner,
            note: note.trim() || null,
            isPrivate,
          }
        : {
            date,
            incomeCategoryId: incomeCatId,
            description: description.trim(),
            amountUsd: currency === "USD" ? parsed : 0,
            amountUzs: currency === "UZS" ? parsed : 0,
            owner,
            note: note.trim() || null,
          };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.show(data.error ?? "Не удалось сохранить", { kind: "error" });
        return;
      }
      const created = (await res.json()) as {
        dailyExpense?: { id: number };
        income?: { id: number };
      };
      const createdId = created.dailyExpense?.id ?? created.income?.id;
      haptic("success");
      toast.show(
        isExpense ? "Расход добавлен" : "Доход добавлен",
        {
          kind: "success",
          action: createdId
            ? {
                label: "Отменить",
                onAction: async () => {
                  await fetch(
                    isExpense
                      ? `/api/daily-expenses/${createdId}`
                      : `/api/incomes/${createdId}`,
                    { method: "DELETE" },
                  );
                  router.refresh();
                  toast.show("Отменено");
                },
              }
            : undefined,
        },
      );
      router.refresh();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  const activeCats = kind === "expense" ? categories : incomeCategories;
  const activeCatId = kind === "expense" ? expenseCatId : incomeCatId;
  const setActiveCatId =
    kind === "expense" ? setExpenseCatId : setIncomeCatId;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      title={
        <div className="flex items-center justify-between gap-3">
          <span>Быстро добавить</span>
          <Segmented
            size="sm"
            value={kind}
            onChange={(v) => setKind(v)}
            options={[
              { value: "expense", label: "Расход" },
              { value: "income", label: "Доход" },
            ]}
            ariaLabel="Тип записи"
          />
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <Label>Сумма</Label>
            <Input
              ref={amountRef}
              inputMode="decimal"
              enterKeyHint="done"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 text-2xl font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Валюта</Label>
            <Segmented
              size="md"
              value={currency}
              onChange={(v) => setCurrency(v)}
              options={[
                { value: "UZS", label: "сум" },
                { value: "USD", label: "$" },
              ]}
              ariaLabel="Валюта"
              className="h-14 rounded-2xl p-1.5"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Категория</Label>
            <span className="text-[12px] text-muted-foreground">
              {activeCats.length} шт
            </span>
          </div>
          <div className="-mx-1 flex snap-x snap-mandatory overflow-x-auto px-1 pb-1 pt-0.5">
            <div className="flex gap-2">
              {activeCats.map((c) => {
                const isActive = c.id === activeCatId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCatId(c.id);
                      haptic("light");
                    }}
                    className={cn(
                      "snap-start rounded-2xl border px-3 py-2 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span aria-hidden>{c.icon ?? "•"}</span>
                      <span>{c.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Кто</Label>
            <Segmented
              size="sm"
              value={owner}
              onChange={(v) => setOwner(v as Owner)}
              options={owners.map((o) => ({ value: o, label: o }))}
              ariaLabel="Кто"
              className="w-full justify-between"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Дата</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-[13px] font-medium text-primary transition-colors hover:opacity-80"
        >
          {showMore ? "Свернуть детали" : "Ещё детали (описание, заметка)"}
        </button>

        {showMore ? (
          <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  kind === "expense" ? "Что купили?" : "Источник дохода"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Заметка</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Опционально"
              />
            </div>
            {kind === "expense" ? (
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                    isPrivate
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  {isPrivate ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span>Личный расход (не виден партнёру)</span>
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onSave}
            disabled={busy || !activeCatId}
          >
            {busy ? "Сохранение…" : "Добавить"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
