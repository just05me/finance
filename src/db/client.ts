import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const globalForPg = globalThis as unknown as {
  __financeSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForPg.__financeSql ??
  postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__financeSql = sql;
}

export const db = drizzle(sql, { schema });
export const rawSql = sql;
