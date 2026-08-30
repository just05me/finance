import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => undefined });

const statements: string[] = [
  `DO $$ BEGIN
    CREATE TYPE currency AS ENUM ('USD', 'UZS');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN
    CREATE TYPE owner AS ENUM ('Ризо', 'Алина', 'Семейное');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN
    CREATE TYPE goal_status AS ENUM ('Активна', 'На паузе', 'Завершена');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN
    CREATE TYPE theme_mode AS ENUM ('auto', 'light', 'dark');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme_mode theme_mode NOT NULL DEFAULT 'auto',
    default_currency currency NOT NULL DEFAULT 'UZS'
  );`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    default_rate REAL NOT NULL,
    last_known_rate REAL,
    last_known_rate_date TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT false
  );`,
  `CREATE TABLE IF NOT EXISTS income_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT false
  );`,
  `CREATE TABLE IF NOT EXISTS months (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    exchange_rate REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS months_year_month_unique ON months (year, month);`,
  `CREATE TABLE IF NOT EXISTS planned_payments (
    id SERIAL PRIMARY KEY,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    currency currency NOT NULL,
    plan_amount REAL NOT NULL,
    fact_amount REAL,
    paid BOOLEAN NOT NULL DEFAULT false,
    owner owner NOT NULL,
    due_day INTEGER,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS planned_payments_month_idx ON planned_payments (month_id);`,
  `CREATE TABLE IF NOT EXISTS daily_expenses (
    id SERIAL PRIMARY KEY,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL DEFAULT '',
    amount_usd REAL NOT NULL DEFAULT 0,
    amount_uzs REAL NOT NULL DEFAULT 0,
    owner owner NOT NULL,
    note TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS daily_expenses_month_idx ON daily_expenses (month_id);`,
  `CREATE INDEX IF NOT EXISTS daily_expenses_date_idx ON daily_expenses (date);`,
  `CREATE INDEX IF NOT EXISTS daily_expenses_category_idx ON daily_expenses (category_id);`,
  `CREATE INDEX IF NOT EXISTS daily_expenses_created_by_idx ON daily_expenses (created_by_user_id);`,
  `CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    income_category_id INTEGER NOT NULL REFERENCES income_categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL DEFAULT '',
    amount_usd REAL NOT NULL DEFAULT 0,
    amount_uzs REAL NOT NULL DEFAULT 0,
    owner owner NOT NULL,
    note TEXT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS incomes_month_idx ON incomes (month_id);`,
  `CREATE INDEX IF NOT EXISTS incomes_date_idx ON incomes (date);`,
  `CREATE INDEX IF NOT EXISTS incomes_category_idx ON incomes (income_category_id);`,
  `CREATE INDEX IF NOT EXISTS incomes_created_by_idx ON incomes (created_by_user_id);`,
  `CREATE TABLE IF NOT EXISTS regular_income_templates (
    id SERIAL PRIMARY KEY,
    income_category_id INTEGER NOT NULL REFERENCES income_categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL DEFAULT '',
    amount_usd REAL NOT NULL DEFAULT 0,
    amount_uzs REAL NOT NULL DEFAULT 0,
    owner owner NOT NULL,
    day_of_month INTEGER,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    currency currency NOT NULL,
    target_amount REAL NOT NULL,
    monthly_contribution REAL NOT NULL DEFAULT 0,
    status goal_status NOT NULL DEFAULT 'Активна',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
  );`,
  `CREATE TABLE IF NOT EXISTS goal_contributions (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    plan_amount REAL NOT NULL DEFAULT 0,
    fact_amount REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS goal_contributions_goal_month_unique ON goal_contributions (goal_id, month_id);`,
];

async function run(): Promise<void> {
  console.log("[migrate] Connecting to Postgres...");
  await sql`SELECT 1`;
  console.log("[migrate] Applying schema...");
  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
  console.log("[migrate] Done.");
  await sql.end({ timeout: 5 });
}

run().catch(async (err) => {
  console.error("[migrate] Failed:", err);
  await sql.end({ timeout: 5 }).catch(() => undefined);
  process.exit(1);
});
