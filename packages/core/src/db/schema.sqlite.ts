/**
 * SQLite schema — the primary dialect (ADR-0006). Built with native `sqlite-core`
 * builders for full type-safe queries; columns come from the shared vocabulary so this
 * stays in lockstep with `./schema.pg.ts` (enforced by the parity test).
 */

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { audit, deletedAt, id } from "./columns/sqlite.js";

/**
 * The `Organization` — the tenant root. Everything in the engine is scoped to an org;
 * the schema is multi-tenant-capable but runs fine single-tenant for self-host (§1, §4).
 */
export const organizations = sqliteTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  deletedAt: deletedAt(),
  ...audit(),
});
