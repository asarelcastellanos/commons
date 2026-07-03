/**
 * Database client factory. Reads the one connection string (ARCHITECTURE.md §5),
 * resolves the dialect, and returns a Drizzle instance for that engine (ADR-0006).
 *
 * SQLite (primary) runs on `better-sqlite3`; Postgres (hosted tier) on `pg`. The result
 * is a discriminated union so the rare caller that must branch can, while most code will
 * go through the (future) dialect-neutral repository layer.
 */

import BetterSqlite3 from "better-sqlite3";
import {
  drizzle as drizzleSqlite,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import pg from "pg";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { resolveDialect, sqliteFilename } from "./dialect.js";
import * as sqliteSchema from "./schema.sqlite.js";
import * as pgSchema from "./schema.pg.js";

export type SqliteDb = BetterSQLite3Database<typeof sqliteSchema>;
export type PgDb = NodePgDatabase<typeof pgSchema>;

export type Db =
  | { dialect: "sqlite"; orm: SqliteDb; close: () => void }
  | { dialect: "postgres"; orm: PgDb; close: () => Promise<void> };

/** Build a Drizzle client from a connection string. */
export function createDb(url: string | undefined): Db {
  const dialect = resolveDialect(url);

  if (dialect === "sqlite") {
    const sqlite = new BetterSqlite3(sqliteFilename(url!));
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    return {
      dialect,
      orm: drizzleSqlite(sqlite, { schema: sqliteSchema }),
      close: () => sqlite.close(),
    };
  }

  const pool = new pg.Pool({ connectionString: url });
  return {
    dialect,
    orm: drizzlePg(pool, { schema: pgSchema }),
    close: () => pool.end(),
  };
}

let cached: Db | undefined;

/** Process-wide singleton built from `process.env.DATABASE_URL`. */
export function getDb(): Db {
  cached ??= createDb(process.env.DATABASE_URL);
  return cached;
}
