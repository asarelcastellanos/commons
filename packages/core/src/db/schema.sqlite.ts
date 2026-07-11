/**
 * SQLite schema — the primary dialect (SQLite is the default engine, used for dev, tests,
 * and self-host). Tables are built with native `sqlite-core` builders so queries stay
 * fully type-safe; their columns come from the shared vocabulary (`./columns/sqlite.ts`)
 * so this file stays in lockstep with its Postgres twin `./schema.pg.ts`. The parity test
 * fails the build if they drift.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { audit, deletedAt, id, orgId } from "./columns/sqlite.js";
import { ROLES } from "../domain/staff-user.js";

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

/**
 * A Staff User — someone who LOGS IN to operate the org. Distinct from a Person (roster):
 * staff authenticate, members never do (§7). `role` is the ladder from ../domain/staff-user;
 * `personId` optionally links a staffer to their own roster row. `passwordHash` is nullable
 * so a hosted deployment can back a user with an external provider instead of a password.
 */
export const users = sqliteTable("users", {
  id: id(),
  orgId: orgId(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ROLES }).notNull(),
  personId: text("person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  deletedAt: deletedAt(),
  ...audit(),
});

/**
 * A login session. Deliberately breaks the usual conventions: it CASCADE-deletes with its
 * user and skips soft-delete/audit, because a session is ephemeral state, not history (§5's
 * "never hard-delete" rule is about history-carrying rows, not this). Only the SHA-256 of
 * the token is stored — never the token itself.
 */
export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
