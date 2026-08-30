import type { Config } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/finance";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
