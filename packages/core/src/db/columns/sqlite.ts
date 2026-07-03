/**
 * Shared SQLite column vocabulary (ADR-0006). Every table is built from these so the
 * two dialect schemas can't drift on conventions. The common-type mapping for SQLite:
 * uuid -> text, timestamp -> epoch-millis integer.
 */

import { integer, text } from "drizzle-orm/sqlite-core";
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
