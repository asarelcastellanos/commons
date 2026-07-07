/**
 * SQLite schema — the primary dialect (SQLite is the default engine, used for dev, tests,
 * and self-host). Tables are built with native `sqlite-core` builders so queries stay
 * fully type-safe; their columns come from the shared vocabulary (`./columns/sqlite.ts`)
 * so this file stays in lockstep with its Postgres twin `./schema.pg.ts`. The parity test
 * fails the build if they drift.
 */

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { audit, deletedAt, id, orgId } from "./columns/sqlite.js";

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

/**
 * A `Person` in the roster. People ARE the community — members, attendees, volunteers —
 * and they never log in; staff check them in via forms/QR (§4, §7). Login and roles belong
 * to a separate Staff User model added with auth, never here. `orgId` is the engine's first
 * foreign key: everything is scoped to an org, and it's SET NULL (never CASCADE) so a person
 * outlives the hard-deletion of their org rather than being erased with it (§5).
 */
export const people = sqliteTable("people", {
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
