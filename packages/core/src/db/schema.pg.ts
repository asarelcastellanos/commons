/**
 * Postgres schema — the hosted-tier dialect (ADR-0006). Mirror of `./schema.sqlite.ts`:
 * same table and column names, built with native `pg-core` builders. The parity test
 * fails CI if the two ever diverge.
 */

import { pgTable, text } from "drizzle-orm/pg-core";
import { audit, deletedAt, id } from "./columns/pg.js";

/** The `Organization` — the tenant root (mirror of the SQLite definition). */
export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  deletedAt: deletedAt(),
  ...audit(),
});
