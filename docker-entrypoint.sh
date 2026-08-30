#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL is required"
  exit 1
fi

echo "[entrypoint] Waiting for Postgres..."
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5, idle_timeout: 5 });
(async () => {
  for (let i = 0; i < 30; i += 1) {
    try { await sql\`SELECT 1\`; await sql.end({ timeout: 2 }); process.exit(0); }
    catch (e) { await new Promise(r => setTimeout(r, 1000)); }
  }
  console.error('Postgres not reachable');
  process.exit(1);
})();
"

echo "[entrypoint] Running migrations..."
node_modules/.bin/tsx src/db/migrate.ts

USER_COUNT=$(node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
(async () => {
  try {
    const rows = await sql\`SELECT COUNT(*)::int AS c FROM users\`;
    console.log(rows[0].c);
  } catch (e) { console.log(0); }
  await sql.end({ timeout: 2 });
})();
")

if [ "$USER_COUNT" = "0" ]; then
  echo "[entrypoint] Empty DB detected; running seed..."
  node_modules/.bin/tsx scripts/seed.ts
else
  echo "[entrypoint] Users already present; skipping seed."
fi

exec "$@"
