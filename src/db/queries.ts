import { and, asc, desc, eq, sum } from "drizzle-orm";
import { db } from "./client";
import {
  categories,
  dailyExpenses,
  goalContributions,
  incomeCategories,
  incomes,
  months,
  plannedPayments,
  regularIncomeTemplates,
  savingsGoals,
  settings,
  userPreferences,
  users,
  type Category,
  type DailyExpense,
  type GoalContribution,
  type Income,
  type IncomeCategory,
  type Month,
  type PlannedPayment,
  type RegularIncomeTemplate,
  type SavingsGoal,
  type Settings,
  type ThemeMode,
  type User,
  type UserPreference,
} from "./schema";

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error("Settings row missing. Run seed first.");
  }
  return row;
}

export async function upsertSettings(patch: {
  defaultRate?: number;
  lastKnownRate?: number | null;
  lastKnownRateDate?: string | null;
}): Promise<Settings> {
  const current = await getSettings();
  const next = {
    defaultRate: patch.defaultRate ?? current.defaultRate,
    lastKnownRate:
      patch.lastKnownRate === undefined
        ? current.lastKnownRate
        : patch.lastKnownRate,
    lastKnownRateDate:
      patch.lastKnownRateDate === undefined
        ? current.lastKnownRateDate
        : patch.lastKnownRateDate,
  };
  await db
    .insert(settings)
    .values({ id: 1, ...next })
    .onConflictDoUpdate({ target: settings.id, set: next });
  return getSettings();
}

export async function listCategories(
  includeArchived = false,
): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return includeArchived ? rows : rows.filter((c) => !c.archived);
}

export async function listIncomeCategories(
  includeArchived = false,
): Promise<IncomeCategory[]> {
  const rows = await db
    .select()
    .from(incomeCategories)
    .orderBy(asc(incomeCategories.sortOrder), asc(incomeCategories.name));
  return includeArchived ? rows : rows.filter((c) => !c.archived);
}

export async function listMonths(): Promise<Month[]> {
  return db
    .select()
    .from(months)
    .orderBy(desc(months.year), desc(months.month));
}

export async function getMonthById(id: number): Promise<Month | undefined> {
  const rows = await db.select().from(months).where(eq(months.id, id));
  return rows[0];
}

export async function getMonthByYearMonth(
  year: number,
  month: number,
): Promise<Month | undefined> {
  const rows = await db
    .select()
    .from(months)
    .where(and(eq(months.year, year), eq(months.month, month)));
  return rows[0];
}

export async function getLatestMonth(): Promise<Month | undefined> {
  const rows = await db
    .select()
    .from(months)
    .orderBy(desc(months.year), desc(months.month))
    .limit(1);
  return rows[0];
}

export async function listPlannedPayments(
  monthId: number,
): Promise<PlannedPayment[]> {
  return db
    .select()
    .from(plannedPayments)
    .where(eq(plannedPayments.monthId, monthId))
    .orderBy(asc(plannedPayments.sortOrder), asc(plannedPayments.id));
}

export async function listDailyExpenses(
  monthId: number,
  opts: { includePrivateOfUserId?: number | null } = {},
): Promise<DailyExpense[]> {
  const rows = await db
    .select()
    .from(dailyExpenses)
    .where(eq(dailyExpenses.monthId, monthId))
    .orderBy(desc(dailyExpenses.date), desc(dailyExpenses.id));
  const uid = opts.includePrivateOfUserId ?? null;
  return rows.filter((r) => !r.isPrivate || r.createdByUserId === uid);
}

export async function listIncomes(
  monthId: number,
): Promise<Income[]> {
  return db
    .select()
    .from(incomes)
    .where(eq(incomes.monthId, monthId))
    .orderBy(desc(incomes.date), desc(incomes.id));
}

export async function listRegularIncomeTemplates(): Promise<
  RegularIncomeTemplate[]
> {
  return db
    .select()
    .from(regularIncomeTemplates)
    .orderBy(asc(regularIncomeTemplates.sortOrder), asc(regularIncomeTemplates.id));
}

export async function listGoals(): Promise<SavingsGoal[]> {
  return db
    .select()
    .from(savingsGoals)
    .orderBy(asc(savingsGoals.sortOrder), asc(savingsGoals.id));
}

export async function listContributionsByMonth(
  monthId: number,
): Promise<GoalContribution[]> {
  return db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.monthId, monthId));
}

export async function listAllContributions(): Promise<GoalContribution[]> {
  return db.select().from(goalContributions);
}

export async function findUserByEmail(
  email: string,
): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email));
  return rows[0];
}

export async function findUserById(id: number): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id));
  return rows[0];
}

export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.id));
}

export async function sumGoalTotal(goalId: number): Promise<number> {
  const rows = await db
    .select({ total: sum(goalContributions.factAmount) })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId));
  const val = rows[0]?.total ?? "0";
  return Number(val) || 0;
}

export async function getUserPreferences(
  userId: number,
): Promise<UserPreference> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  if (rows[0]) return rows[0];
  const defaults = {
    userId,
    themeMode: "auto" as ThemeMode,
    defaultCurrency: "UZS" as const,
  };
  await db.insert(userPreferences).values(defaults);
  return defaults;
}

export async function updateUserPreferences(
  userId: number,
  patch: Partial<Omit<UserPreference, "userId">>,
): Promise<UserPreference> {
  await getUserPreferences(userId);
  await db
    .update(userPreferences)
    .set(patch)
    .where(eq(userPreferences.userId, userId));
  return getUserPreferences(userId);
}
