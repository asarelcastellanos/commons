/**
 * Migration runner. A "migration" is a versioned SQL script that brings a database's
 * shape up to date with the code (create the `organizations` table, add a column, etc.).
 * Drizzle generates these scripts from our schema files; this runner APPLIES the pending
 * ones. Because the two engines need different SQL, each dialect has its own folder of
 * scripts (`drizzle/sqlite` or `drizzle/pg`) and we run whichever matches DATABASE_URL.
 *
 * Run with: `pnpm --filter @commons/core db:migrate`
 *
 * Today this applies the single core folder. Later (milestone M2) the module registry
 * will run migrations per ENABLED module instead — each subsystem/vertical owns its own
 * tables and only those get created (ARCHITECTURE.md §5, §11). That is the "modules plug
 * into core" model; this runner is its simple precursor.
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
