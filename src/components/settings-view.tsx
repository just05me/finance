"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useTheme, type ThemeMode } from "@/components/theme-provider";
import { useToast } from "@/components/toast-provider";
import type {
  Category,
  IncomeCategory,
  Owner,
  RegularIncomeTemplate,
  Settings,
  UserPreference,
} from "@/db/schema";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  settings: Settings;
  preferences: UserPreference;
  expenseCategories: Category[];
  incomeCategories: IncomeCategory[];
  templates: RegularIncomeTemplate[];
}

const owners: Owner[] = ["Ризо", "Алина", "Семейное"];

export function SettingsView(props: Props): React.ReactElement {
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [rate, setRate] = React.useState(String(props.settings.defaultRate));

  async function saveRate(): Promise<void> {
    const n = Number(rate);
    if (!Number.isFinite(n) || n <= 0) {
      toast.show("Некорректный курс", { kind: "warning" });
      return;
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultRate: n }),
    });
    if (res.ok) {
      toast.show("Курс сохранён", { kind: "success" });
      router.refresh();
    } else {
      toast.show("Ошибка сохранения", { kind: "error" });
    }
  }

  async function updateTheme(next: ThemeMode): Promise<void> {
    setMode(next);
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeMode: next }),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="display-2">Настройки</h1>
        <p className="body-sm text-muted-foreground">
          Персонализация, категории, регулярные доходы, безопасность.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Внешний вид</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">Тема</div>
              <div className="text-[12.5px] text-muted-foreground">
                Авто следит за системной темой
              </div>
            </div>
            <Segmented
              value={mode}
              onChange={(v) => updateTheme(v)}
              options={[
                { value: "auto", label: "Авто" },
                { value: "light", label: "Светлая" },
                { value: "dark", label: "Тёмная" },
              ]}
              ariaLabel="Тема"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Курс USD/UZS по умолчанию</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>Резервный курс</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="text-right"
              />
            </div>
            <Button onClick={saveRate}>Сохранить</Button>
          </div>
          {props.settings.lastKnownRate ? (
            <p className="text-[12.5px] text-muted-foreground">
              Последний известный от ЦБ:{" "}
              <b>{props.settings.lastKnownRate.toLocaleString("ru-RU")}</b>
              {props.settings.lastKnownRateDate
                ? ` (${props.settings.lastKnownRateDate})`
                : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CategoryEditor
        title="Категории расходов"
        endpoint="/api/categories"
        items={props.expenseCategories}
      />
      <CategoryEditor
        title="Категории доходов"
        endpoint="/api/income-categories"
        items={props.incomeCategories}
      />

      <RegularIncomeEditor
        templates={props.templates}
        incomeCategories={props.incomeCategories.filter((c) => !c.archived)}
      />

      <PasswordCard />
    </div>
  );
}

function CategoryEditor({
  title,
  endpoint,
  items,
}: {
  title: string;
  endpoint: string;
  items: (Category | IncomeCategory)[];
}): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("");

  async function add(): Promise<void> {
    if (!name.trim()) return;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon: icon.trim() || null }),
    });
    if (res.ok) {
      toast.show("Добавлено");
      setName("");
      setIcon("");
      setAddOpen(false);
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast.show(data.error ?? "Ошибка", { kind: "error" });
    }
  }

  async function patch(
    id: number,
    body: Partial<Category | IncomeCategory>,
  ): Promise<void> {
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) router.refresh();
    else toast.show("Не удалось", { kind: "error" });
  }

  async function del(id: number): Promise<void> {
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.show("Удалено");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast.show(data.error ?? "Не удалось", { kind: "warning" });
    }
  }

  const active = items.filter((c) => !c.archived);
  const archived = items.filter((c) => c.archived);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" variant="soft" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {active.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onRename={(v) => patch(c.id, { name: v })}
              onIcon={(v) => patch(c.id, { icon: v || null })}
              onArchive={() => patch(c.id, { archived: true })}
              onDelete={() => del(c.id)}
            />
          ))}
        </div>
        {archived.length > 0 ? (
          <div>
            <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
              Архив
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {archived.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/40 px-3 py-1.5"
                >
                  <span className="text-lg">{c.icon ?? "•"}</span>
                  <span className="flex-1 text-sm text-muted-foreground">
                    {c.name}
                  </span>
                  <button
                    type="button"
                    aria-label="Восстановить"
                    onClick={() => patch(c.id, { archived: false })}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ArchiveRestore className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Удалить"
                    onClick={() => del(c.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={`Новая категория`}
      >
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Продукты"
            />
          </div>
          <div className="space-y-1">
            <Label>Иконка (эмоджи, опц.)</Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🛒"
              maxLength={3}
              className="w-24 text-center text-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={add}>Создать</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function CategoryRow({
  category,
  onRename,
  onIcon,
  onArchive,
  onDelete,
}: {
  category: Category | IncomeCategory;
  onRename: (v: string) => void;
  onIcon: (v: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}): React.ReactElement {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(category.name);
  const [icon, setIcon] = React.useState(category.icon ?? "");
  return (
    <div className="group flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5 shadow-soft">
      {editing ? (
        <>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={3}
            className="h-8 w-12 px-1 text-center text-lg"
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1"
          />
          <Button
            size="sm"
            onClick={() => {
              if (name !== category.name) onRename(name);
              if (icon !== (category.icon ?? "")) onIcon(icon);
              setEditing(false);
            }}
          >
            Ок
          </Button>
        </>
      ) : (
        <>
          <span className="text-lg">{category.icon ?? "•"}</span>
          <span className="flex-1 text-sm font-medium">{category.name}</span>
          <button
            type="button"
            aria-label="Редактировать"
            onClick={() => setEditing(true)}
            className="rounded-full p-1.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="В архив"
            onClick={onArchive}
            className="rounded-full p-1.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Удалить"
            onClick={onDelete}
            className="rounded-full p-1.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function RegularIncomeEditor({
  templates,
  incomeCategories,
}: {
  templates: RegularIncomeTemplate[];
  incomeCategories: IncomeCategory[];
}): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [catId, setCatId] = React.useState<number>(
    incomeCategories[0]?.id ?? 0,
  );
  const [owner, setOwner] = React.useState<Owner>("Ризо");
  const [amountUsd, setAmountUsd] = React.useState("");
  const [amountUzs, setAmountUzs] = React.useState("");
  const [dayOfMonth, setDayOfMonth] = React.useState("");

  async function add(): Promise<void> {
    if (!catId) {
      toast.show("Выберите категорию", { kind: "warning" });
      return;
    }
    const res = await fetch("/api/regular-income-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incomeCategoryId: catId,
        description: description.trim(),
        amountUsd: Number(amountUsd) || 0,
        amountUzs: Number(amountUzs) || 0,
        owner,
        dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
        active: true,
        sortOrder: templates.length,
      }),
    });
    if (res.ok) {
      toast.show("Шаблон создан");
      setAddOpen(false);
      setDescription("");
      setAmountUsd("");
      setAmountUzs("");
      setDayOfMonth("");
      router.refresh();
    } else {
      toast.show("Не удалось", { kind: "error" });
    }
  }

  async function toggle(t: RegularIncomeTemplate): Promise<void> {
    const res = await fetch(`/api/regular-income-templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    });
    if (res.ok) router.refresh();
  }

  async function del(id: number): Promise<void> {
    const res = await fetch(`/api/regular-income-templates/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.show("Удалено");
      router.refresh();
    }
  }

  const catById = new Map(incomeCategories.map((c) => [c.id, c] as const));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Регулярные доходы</CardTitle>
        <Button size="sm" variant="soft" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пусто. Шаблоны копируются в новый месяц автоматически.
          </p>
        ) : (
          templates.map((t) => {
            const c = catById.get(t.incomeCategoryId);
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-soft",
                  !t.active && "opacity-60",
                )}
              >
                <span className="text-lg">{c?.icon ?? "•"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {t.description || c?.name || "Регулярный доход"}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {t.owner} · {c?.name ?? "Прочее"}
                    {t.dayOfMonth ? ` · ${t.dayOfMonth} число` : ""}
                  </div>
                </div>
                <div className="text-right num-tabular text-[13.5px] font-semibold">
                  {t.amountUsd > 0
                    ? formatUsd(t.amountUsd)
                    : `${t.amountUzs.toLocaleString("ru-RU")} сум`}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-semibold",
                    t.active
                      ? "bg-success/12 text-success hover:bg-success/20"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t.active ? "Вкл" : "Выкл"}
                </button>
                <button
                  type="button"
                  aria-label="Удалить"
                  onClick={() => del(t.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </CardContent>
      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Новый регулярный доход"
      >
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Описание</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Зарплата Ризо"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Категория</Label>
              <Select
                value={catId}
                onChange={(e) => setCatId(Number(e.target.value))}
              >
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Кто</Label>
              <Select
                value={owner}
                onChange={(e) => setOwner(e.target.value as Owner)}
              >
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>USD</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-1">
              <Label>UZS</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amountUzs}
                onChange={(e) => setAmountUzs(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-1">
              <Label>День</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="text-center"
                placeholder="—"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={add}>Создать</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function PasswordCard(): React.ReactElement {
  const toast = useToast();
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function save(): Promise<void> {
    if (!oldPassword || newPassword.length < 6) {
      toast.show("Новый пароль минимум 6 символов", { kind: "warning" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (res.ok) {
        toast.show("Пароль обновлён", { kind: "success" });
        setOldPassword("");
        setNewPassword("");
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.show(data.error ?? "Ошибка", { kind: "error" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пароль</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Текущий</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Новый</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? "Сохраняем…" : "Обновить пароль"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
