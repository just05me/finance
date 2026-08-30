import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", ["USD", "UZS"]);
export const ownerEnum = pgEnum("owner", ["Ризо", "Алина", "Семейное"]);
export const goalStatusEnum = pgEnum("goal_status", [
  "Активна",
  "На паузе",
  "Завершена",
]);
export const themeModeEnum = pgEnum("theme_mode", ["auto", "light", "dark"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  themeMode: themeModeEnum("theme_mode").notNull().default("auto"),
  defaultCurrency: currencyEnum("default_currency").notNull().default("UZS"),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  defaultRate: real("default_rate").notNull(),
  lastKnownRate: real("last_known_rate"),
  lastKnownRateDate: text("last_known_rate_date"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
});

export const incomeCategories = pgTable("income_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
});

export const months = pgTable(
  "months",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    exchangeRate: real("exchange_rate").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    yearMonthUnique: uniqueIndex("months_year_month_unique").on(
      t.year,
      t.month,
    ),
  }),
);

export const plannedPayments = pgTable(
  "planned_payments",
  {
    id: serial("id").primaryKey(),
    monthId: integer("month_id")
      .notNull()
      .references(() => months.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    currency: currencyEnum("currency").notNull(),
    planAmount: real("plan_amount").notNull(),
    factAmount: real("fact_amount"),
    paid: boolean("paid").notNull().default(false),
    owner: ownerEnum("owner").notNull(),
    dueDay: integer("due_day"),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    monthIdx: index("planned_payments_month_idx").on(t.monthId),
  }),
);

export const dailyExpenses = pgTable(
  "daily_expenses",
  {
    id: serial("id").primaryKey(),
    monthId: integer("month_id")
      .notNull()
      .references(() => months.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    description: text("description").notNull().default(""),
    amountUsd: real("amount_usd").notNull().default(0),
    amountUzs: real("amount_uzs").notNull().default(0),
    owner: ownerEnum("owner").notNull(),
    note: text("note"),
    isPrivate: boolean("is_private").notNull().default(false),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    monthIdx: index("daily_expenses_month_idx").on(t.monthId),
    dateIdx: index("daily_expenses_date_idx").on(t.date),
    categoryIdx: index("daily_expenses_category_idx").on(t.categoryId),
    createdByIdx: index("daily_expenses_created_by_idx").on(t.createdByUserId),
  }),
);

export const incomes = pgTable(
  "incomes",
  {
    id: serial("id").primaryKey(),
    monthId: integer("month_id")
      .notNull()
      .references(() => months.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    incomeCategoryId: integer("income_category_id")
      .notNull()
      .references(() => incomeCategories.id, { onDelete: "restrict" }),
    description: text("description").notNull().default(""),
    amountUsd: real("amount_usd").notNull().default(0),
    amountUzs: real("amount_uzs").notNull().default(0),
    owner: ownerEnum("owner").notNull(),
    note: text("note"),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    monthIdx: index("incomes_month_idx").on(t.monthId),
    dateIdx: index("incomes_date_idx").on(t.date),
    categoryIdx: index("incomes_category_idx").on(t.incomeCategoryId),
    createdByIdx: index("incomes_created_by_idx").on(t.createdByUserId),
  }),
);

export const regularIncomeTemplates = pgTable("regular_income_templates", {
  id: serial("id").primaryKey(),
  incomeCategoryId: integer("income_category_id")
    .notNull()
    .references(() => incomeCategories.id, { onDelete: "restrict" }),
  description: text("description").notNull().default(""),
  amountUsd: real("amount_usd").notNull().default(0),
  amountUzs: real("amount_uzs").notNull().default(0),
  owner: ownerEnum("owner").notNull(),
  dayOfMonth: integer("day_of_month"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  currency: currencyEnum("currency").notNull(),
  targetAmount: real("target_amount").notNull(),
  monthlyContribution: real("monthly_contribution").notNull().default(0),
  status: goalStatusEnum("status").notNull().default("Активна"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: serial("id").primaryKey(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    monthId: integer("month_id")
      .notNull()
      .references(() => months.id, { onDelete: "cascade" }),
    planAmount: real("plan_amount").notNull().default(0),
    factAmount: real("fact_amount").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    goalMonthUnique: uniqueIndex("goal_contributions_goal_month_unique").on(
      t.goalId,
      t.monthId,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type IncomeCategory = typeof incomeCategories.$inferSelect;
export type Month = typeof months.$inferSelect;
export type PlannedPayment = typeof plannedPayments.$inferSelect;
export type DailyExpense = typeof dailyExpenses.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type RegularIncomeTemplate = typeof regularIncomeTemplates.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewMonth = typeof months.$inferInsert;
export type NewPlannedPayment = typeof plannedPayments.$inferInsert;
export type NewDailyExpense = typeof dailyExpenses.$inferInsert;
export type NewIncome = typeof incomes.$inferInsert;
export type NewRegularIncomeTemplate = typeof regularIncomeTemplates.$inferInsert;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
export type NewGoalContribution = typeof goalContributions.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewIncomeCategory = typeof incomeCategories.$inferInsert;

export type Currency = "USD" | "UZS";
export type Owner = "Ризо" | "Алина" | "Семейное";
export type GoalStatus = "Активна" | "На паузе" | "Завершена";
export type ThemeMode = "auto" | "light" | "dark";
