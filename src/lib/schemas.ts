import { z } from "zod";

export const currencySchema = z.enum(["USD", "UZS"]);
export const ownerSchema = z.enum(["Ризо", "Алина", "Семейное"]);
export const goalStatusSchema = z.enum(["Активна", "На паузе", "Завершена"]);
export const themeModeSchema = z.enum(["auto", "light", "dark"]);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Дата должна быть в формате YYYY-MM-DD");

export const monthCreateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  exchangeRate: z.number().positive().optional(),
});

export const monthUpdateSchema = z.object({
  exchangeRate: z.number().positive().optional(),
});

export const plannedPaymentCreateSchema = z.object({
  monthId: z.number().int().positive(),
  title: z.string().min(1),
  currency: currencySchema,
  planAmount: z.number().nonnegative(),
  factAmount: z.number().nullable().optional(),
  paid: z.boolean().optional(),
  owner: ownerSchema,
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  note: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const plannedPaymentUpdateSchema = plannedPaymentCreateSchema
  .partial()
  .extend({ monthId: z.number().int().positive().optional() });

export const dailyExpenseCreateSchema = z.object({
  monthId: z.number().int().positive().optional(),
  date: dateSchema,
  categoryId: z.number().int().positive(),
  description: z.string().default(""),
  amountUsd: z.number().nonnegative().default(0),
  amountUzs: z.number().nonnegative().default(0),
  owner: ownerSchema,
  note: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
});

export const dailyExpenseUpdateSchema = dailyExpenseCreateSchema.partial();

export const incomeCreateSchema = z.object({
  monthId: z.number().int().positive().optional(),
  date: dateSchema,
  incomeCategoryId: z.number().int().positive(),
  description: z.string().default(""),
  amountUsd: z.number().nonnegative().default(0),
  amountUzs: z.number().nonnegative().default(0),
  owner: ownerSchema,
  note: z.string().nullable().optional(),
});

export const incomeUpdateSchema = incomeCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const regularIncomeTemplateCreateSchema = z.object({
  incomeCategoryId: z.number().int().positive(),
  description: z.string().default(""),
  amountUsd: z.number().nonnegative().default(0),
  amountUzs: z.number().nonnegative().default(0),
  owner: ownerSchema,
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const regularIncomeTemplateUpdateSchema =
  regularIncomeTemplateCreateSchema.partial();

export const goalCreateSchema = z.object({
  title: z.string().min(1),
  currency: currencySchema,
  targetAmount: z.number().positive(),
  monthlyContribution: z.number().nonnegative().default(0),
  status: goalStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const goalUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  currency: currencySchema.optional(),
  targetAmount: z.number().positive().optional(),
  monthlyContribution: z.number().nonnegative().optional(),
  status: goalStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const contributionUpsertSchema = z.object({
  monthId: z.number().int().positive(),
  planAmount: z.number().nonnegative().optional(),
  factAmount: z.number().nonnegative().optional(),
});

export const settingsUpdateSchema = z.object({
  defaultRate: z.number().positive().optional(),
});

export const userPreferencesUpdateSchema = z.object({
  themeMode: themeModeSchema.optional(),
  defaultCurrency: currencySchema.optional(),
});

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
