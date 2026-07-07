/**
 * Postgres schema — the hosted-tier dialect. Exact mirror of `./schema.sqlite.ts`: same
 * table and column names, built with native `pg-core` builders, columns drawn from the
 * shared vocabulary (`./columns/pg.ts`). The parity test fails the build if the two ever
 * diverge.
 */

import { pgTable, text } from "drizzle-orm/pg-core";
import { audit, deletedAt, id, orgId } from "./columns/pg.js";

/** The `Organization` — the tenant root (mirror of the SQLite definition). */
export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  deletedAt: deletedAt(),
  ...audit(),
});

/** The `Person` roster row — exact mirror of the SQLite definition (see `./schema.sqlite.ts`). */
export const people = pgTable("people", {
  id: id(),
  orgId: orgId(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  deletedAt: deletedAt(),
  ...audit(),
});
