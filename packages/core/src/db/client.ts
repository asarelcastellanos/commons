/**
 * Database client factory — the one place that actually OPENS a database. It reads the
 * connection string (ARCHITECTURE.md §5), asks `./dialect.ts` which engine it names, and
 * hands back a ready-to-use Drizzle ORM handle for that engine.
 *
 * Why support two engines: self-host is the reason
 * the project exists, and a self-hoster should be able to run from a single SQLite file
 * ("one file, trivial backups"). The paid hosted tier wants Postgres instead. So SQLite
 * (via `better-sqlite3`) is the PRIMARY/default engine and Postgres (via `pg`) is the
 * hosted path — both supported and tested from day one.
 *
 * The return type is a discriminated union (tagged by `dialect`) so the rare caller that
 * MUST branch on engine can. But almost all application code will eventually go through a
 * dialect-neutral "repository" layer so it never sees the difference. That layer is
 * deliberately NOT built yet: we extract abstractions from real call-sites once they
 * exist, rather than guess their shape up front.
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
