import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  goalContributions,
  incomes,
  months,
  plannedPayments,
  savingsGoals,
  users,
  type Month,
} from "@/db/schema";
import {
  getMonthByYearMonth,
  getSettings,
  listRegularIncomeTemplates,
} from "@/db/queries";
import { currentYearMonth } from "@/lib/format";

async function fetchCbuRate(dateIso: string): Promise<number | null> {
  try {
    const url = `https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/${dateIso}/`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ Rate?: string }>;
    const raw = arr[0]?.Rate;
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function resolveInitialRate(): Promise<number> {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const fromCbu = await fetchCbuRate(iso);
  if (fromCbu && fromCbu > 0) return fromCbu;
  for (let back = 1; back <= 5; back += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    const cbu = await fetchCbuRate(d.toISOString().slice(0, 10));
    if (cbu && cbu > 0) return cbu;
  }
  const s = await getSettings();
  return s.lastKnownRate ?? s.defaultRate;
}

interface EnsureOptions {
  clonePlansFromPrevious?: boolean;
  cloneRegularIncomes?: boolean;
  planGoalContributions?: boolean;
  fallbackUserId?: number;
}

export async function ensureMonth(
  year: number,
  month: number,
  opts: EnsureOptions = {},
): Promise<Month> {
  const existing = await getMonthByYearMonth(year, month);
  if (existing) return existing;

  const rate = await resolveInitialRate();
  await db
    .insert(months)
    .values({ year, month, exchangeRate: rate })
    .onConflictDoNothing({ target: [months.year, months.month] });
  const created = await getMonthByYearMonth(year, month);
  if (!created) throw new Error("Failed to create month");
  const isNew = created.createdAt
    ? Date.now() - new Date(created.createdAt).getTime() < 5000
    : true;
  if (!isNew) return created;

  if (opts.clonePlansFromPrevious) {
    const prev =
      month === 1
        ? await getMonthByYearMonth(year - 1, 12)
        : await getMonthByYearMonth(year, month - 1);
    if (prev) {
      const prevPlans = await db
        .select()
        .from(plannedPayments)
        .where(eq(plannedPayments.monthId, prev.id))
        .orderBy(asc(plannedPayments.sortOrder));
      for (const p of prevPlans) {
        await db.insert(plannedPayments).values({
          monthId: created.id,
          title: p.title,
          currency: p.currency,
          planAmount: p.planAmount,
          factAmount: null,
          paid: false,
          owner: p.owner,
          dueDay: p.dueDay,
          note: p.note,
          sortOrder: p.sortOrder,
        });
      }
    }
  }

  if (opts.cloneRegularIncomes) {
    const templates = (await listRegularIncomeTemplates()).filter(
      (t) => t.active,
    );
    if (templates.length > 0) {
      const fallbackUser =
        opts.fallbackUserId ??
        ((await db.select().from(users).orderBy(asc(users.id)).limit(1))[0]?.id ?? null);
      if (fallbackUser) {
        for (const t of templates) {
          const day = Math.min(28, Math.max(1, t.dayOfMonth ?? 5));
          const paddedMonth = String(month).padStart(2, "0");
          const paddedDay = String(day).padStart(2, "0");
          const date = `${year}-${paddedMonth}-${paddedDay}`;
          await db.insert(incomes).values({
            monthId: created.id,
            date,
            incomeCategoryId: t.incomeCategoryId,
            description: t.description || "Регулярный доход",
            amountUsd: t.amountUsd,
            amountUzs: t.amountUzs,
            owner: t.owner,
            note: null,
            createdByUserId: fallbackUser,
          });
        }
      }
    }
  }

  if (opts.planGoalContributions) {
    const goals = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.status, "Активна"));
    for (const g of goals) {
      const existingContrib = await db
        .select()
        .from(goalContributions)
        .where(
          and(
            eq(goalContributions.goalId, g.id),
            eq(goalContributions.monthId, created.id),
          ),
        );
      if (existingContrib[0]) continue;
      await db.insert(goalContributions).values({
        goalId: g.id,
        monthId: created.id,
        planAmount: g.monthlyContribution,
        factAmount: 0,
      });
    }
  }

  return created;
}

export async function getOrCreateCurrentMonth(
  fallbackUserId?: number,
): Promise<Month> {
  const { year, month } = currentYearMonth();
  return ensureMonth(year, month, {
    clonePlansFromPrevious: true,
    cloneRegularIncomes: true,
    planGoalContributions: true,
    fallbackUserId,
  });
}

export async function resolveMonthForDate(
  dateIso: string,
  fallbackUserId?: number,
): Promise<Month> {
  const d = new Date(dateIso);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const isCurrent = (() => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
  })();
  return ensureMonth(year, month, {
    clonePlansFromPrevious: isCurrent,
    cloneRegularIncomes: isCurrent,
    planGoalContributions: isCurrent,
    fallbackUserId,
  });
}
