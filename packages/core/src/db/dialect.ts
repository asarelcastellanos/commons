/**
 * One connection string decides the database engine.
 *
 * Big picture (ARCHITECTURE.md §5, "the data layer"): Commons stores everything in a
 * single schema that runs on EITHER Postgres OR SQLite, and which one you get is chosen
 * purely by the `DATABASE_URL` you set — no code changes, no rebuild. A self-hoster points
 * it at a local file (SQLite); the hosted service points it at Postgres.
 *
 * This module owns just the small, PURE rule that turns a `DATABASE_URL` string into a
 * dialect name ("sqlite" | "postgres"). It opens no connections — that is `./client.ts`'s
 * job. Keeping the rule pure is what lets `./dialect.test.ts` exercise every case with no
 * real database.
 */

export type Dialect = "postgres" | "sqlite";

/**
 * Resolve the database dialect from a connection string.
 *
 *   postgres://…  | postgresql://…            -> "postgres"
 *   file:./data/commons.db | *.db | *.sqlite  -> "sqlite"
 *
 * Throws on anything it does not recognise — we would rather fail at boot than
 * silently pick the wrong engine.
 */
export function resolveDialect(url: string | undefined): Dialect {
  if (!url || url.trim() === "") {
    throw new Error(
      "DATABASE_URL is not set. See .env.example — expected a postgres://… or file:… URL.",
    );
  }

  const value = url.trim();

  if (value.startsWith("postgres://") || value.startsWith("postgresql://")) {
    return "postgres";
  }

  if (
    value === ":memory:" ||
    value.startsWith("file:") ||
    value.startsWith("sqlite:") ||
    value.endsWith(".db") ||
    value.endsWith(".sqlite")
  ) {
    return "sqlite";
  }

  throw new Error(
    `Could not determine a database dialect from DATABASE_URL="${value}". ` +
      `Expected a postgres://… or file:… connection string (ARCHITECTURE.md §5).`,
  );
}

/**
 * Translate a SQLite connection string into a filename for `better-sqlite3`, which wants
 * a filesystem path (or `:memory:`), not a `file:`/`sqlite:` URL.
 */
export function sqliteFilename(url: string): string {
  const value = url.trim();
  if (value === ":memory:" || value === "file::memory:") return ":memory:";
  if (value.startsWith("file:")) return value.slice("file:".length);
  if (value.startsWith("sqlite:")) return value.slice("sqlite:".length);
  return value;
}
