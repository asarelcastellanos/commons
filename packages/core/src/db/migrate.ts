/**
 * Migration runner. Applies pending migrations for the configured dialect, from that
 * dialect's own folder (`drizzle/sqlite` or `drizzle/pg`).
 *
 * Run with: `pnpm --filter @commons/core db:migrate`
 *
 * From M2 the module registry will drive per-module migrations (ARCHITECTURE.md §5, §11);
 * until then this applies the core folder.
 */

import BetterSqlite3 from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { resolveDialect, sqliteFilename } from "./dialect.js";

const folder = (dialect: "sqlite" | "pg") =>
  new URL(`../../drizzle/${dialect}`, import.meta.url).pathname;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const dialect = resolveDialect(url);

  if (dialect === "sqlite") {
    const sqlite = new BetterSqlite3(sqliteFilename(url!));
    try {
      migrateSqlite(drizzleSqlite(sqlite), { migrationsFolder: folder("sqlite") });
    } finally {
      sqlite.close();
    }
  } else {
    const pool = new pg.Pool({ connectionString: url });
    try {
      await migratePg(drizzlePg(pool), { migrationsFolder: folder("pg") });
    } finally {
      await pool.end();
    }
  }

  console.log(`Migrations applied (${dialect}).`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
