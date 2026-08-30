import { spawnSync } from "node:child_process";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, rawSql } from "../src/db/client";
import {
  categories,
  incomeCategories,
  settings,
  users,
} from "../src/db/schema";

const defaultExpenseCategories: Array<{ name: string; icon?: string }> = [
  { name: "Продукты", icon: "🛒" },
  { name: "Кафе / Рестораны", icon: "🍽️" },
  { name: "Кофе", icon: "☕" },
  { name: "Заказ еды", icon: "🛵" },
  { name: "Транспорт", icon: "🚕" },
  { name: "Топливо", icon: "⛽" },
  { name: "Коты", icon: "🐈" },
  { name: "Здоровье / Аптека", icon: "💊" },
  { name: "Одежда", icon: "👕" },
  { name: "Дом", icon: "🏠" },
  { name: "Подарки", icon: "🎁" },
  { name: "Развлечения", icon: "🎬" },
  { name: "Подписки", icon: "🔁" },
  { name: "Красота", icon: "💅" },
  { name: "Путешествия", icon: "✈️" },
  { name: "Прочее", icon: "•" },
];

const defaultIncomeCategories: Array<{ name: string; icon?: string }> = [
  { name: "Зарплата", icon: "💼" },
  { name: "Фриланс", icon: "💻" },
  { name: "Продажа", icon: "🏷️" },
  { name: "Подарок", icon: "🎁" },
  { name: "Возврат / Кэшбэк", icon: "↩️" },
  { name: "Инвестиции", icon: "📈" },
  { name: "Прочее", icon: "•" },
];

function ensureDbMigrated(): void {
  const migrateScript = path.join(process.cwd(), "src", "db", "migrate.ts");
  const result = spawnSync("npx", ["--no-install", "tsx", migrateScript], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error("Migrate failed");
  }
}

async function upsertUser(
  email: string,
  name: string,
  envKey: string,
): Promise<void> {
  const raw = process.env[envKey];
  const password = raw && raw.length > 0 ? raw : "changeme";
  if (!raw) {
    console.warn(
      `[seed] WARN: ${envKey} не задан, используется пароль по умолчанию "changeme". Смените его в интерфейсе.`,
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing[0]) return;
  await db.insert(users).values({ email, name, passwordHash });
  console.log(`[seed] Пользователь создан: ${email}`);
}

async function seedSettings(): Promise<void> {
  const existing = await db.select().from(settings).limit(1);
  if (existing[0]) return;
  await db.insert(settings).values({ id: 1, defaultRate: 12500 });
  console.log("[seed] Настройки инициализированы");
}

async function seedExpenseCategories(): Promise<void> {
  for (let i = 0; i < defaultExpenseCategories.length; i += 1) {
    const c = defaultExpenseCategories[i];
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.name, c.name));
    if (existing[0]) continue;
    await db.insert(categories).values({
      name: c.name,
      icon: c.icon ?? null,
      sortOrder: i,
    });
  }
  console.log(
    `[seed] Категории расходов посеяны (${defaultExpenseCategories.length})`,
  );
}

async function seedIncomeCategories(): Promise<void> {
  for (let i = 0; i < defaultIncomeCategories.length; i += 1) {
    const c = defaultIncomeCategories[i];
    const existing = await db
      .select()
      .from(incomeCategories)
      .where(eq(incomeCategories.name, c.name));
    if (existing[0]) continue;
    await db.insert(incomeCategories).values({
      name: c.name,
      icon: c.icon ?? null,
      sortOrder: i,
    });
  }
  console.log(
    `[seed] Категории доходов посеяны (${defaultIncomeCategories.length})`,
  );
}

async function main(): Promise<void> {
  ensureDbMigrated();
  await seedSettings();
  await seedExpenseCategories();
  await seedIncomeCategories();
  await upsertUser("rizo@family.local", "Ризо", "SEED_PASSWORD_RIZO");
  await upsertUser("alina@family.local", "Алина", "SEED_PASSWORD_ALINA");
  console.log("[seed] Готово.");
  await rawSql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("[seed] Ошибка:", err);
  await rawSql.end({ timeout: 5 }).catch(() => undefined);
  process.exit(1);
});
