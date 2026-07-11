/**
 * Postgres schema — the hosted-tier dialect. Exact mirror of `./schema.sqlite.ts`: same
 * table and column names, built with native `pg-core` builders, columns drawn from the
 * shared vocabulary (`./columns/pg.ts`). The parity test fails the build if the two ever
 * diverge.
 */

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { audit, deletedAt, id, orgId } from "./columns/pg.js";
import { ROLES } from "../domain/staff-user.js";

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

/** Staff Users — mirror of the SQLite definition (see `./schema.sqlite.ts`). */
export const users = pgTable("users", {
  id: id(),
  orgId: orgId(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ROLES }).notNull(),
  personId: uuid("person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  deletedAt: deletedAt(),
  ...audit(),
});

/** Login sessions — mirror of the SQLite definition. */
export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
