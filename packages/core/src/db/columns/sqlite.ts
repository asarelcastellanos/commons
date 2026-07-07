/**
 * Shared SQLite column vocabulary. Drizzle has no single table type that works for both
 * Postgres and SQLite — the engines genuinely differ (SQLite has no native uuid or
 * timezone-aware timestamp) — so each entity is defined once per dialect. To stop those
 * two definitions from drifting on conventions, every table is assembled from these tiny
 * shared building blocks instead of hand-written columns. This is the SQLite half;
 * `./pg.ts` is the Postgres mirror, and `../parity.test.ts` fails the build if the two
 * ever disagree.
 *
 * The SQLite type mapping: uuid -> text, timestamp -> epoch-millis integer.
 */

import { integer, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";

/** Primary key: a uuid stored as text, generated app-side. */
export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

/** `created_at` / `updated_at`, stored as epoch millis, surfaced as `Date`. */
export const audit = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

/** Soft-delete marker — history is never hard-deleted (ARCHITECTURE.md §5). */
export const deletedAt = () => integer("deleted_at", { mode: "timestamp_ms" });

/**
 * `org_id` — a nullable foreign key to the owning organization, `SET NULL` on delete and
 * NEVER cascade: if an org is ever hard-deleted its rows are orphaned, not erased, because
 * they carry history we refuse to lose (ARCHITECTURE.md §5). This is the reusable building
 * block every org-scoped table uses. The target column is passed as a thunk so this file
 * never has to import the schema (avoiding an import cycle): `orgId(() => organizations.id)`.
 */
export const orgId = (ref: () => AnySQLiteColumn) =>
  text("org_id").references(ref, { onDelete: "set null" });
