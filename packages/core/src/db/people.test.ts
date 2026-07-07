/**
 * People roster CRUD + the engine's FIRST foreign key, exercised against a real in-memory
 * SQLite database. Beyond the usual insert / read / soft-delete, the last test proves the
 * SET-NULL convention (ARCHITECTURE.md §5): hard-deleting an organization ORPHANS its
 * people (org_id -> null) instead of erasing them, because a person carries participation
 * history we refuse to lose. (The FK only fires because the client turns `foreign_keys` on.)
 */

import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "./client.js";
import { organizations, people } from "./schema.sqlite.js";

const MIGRATIONS = new URL("../../drizzle/sqlite", import.meta.url).pathname;

function must<T>(v: T | undefined | null, msg = "expected a value"): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v;
}

/** A migrated in-memory SQLite database — the primary engine. */
function freshDb(): Extract<Db, { dialect: "sqlite" }> {
  const db = createDb(":memory:");
  if (db.dialect !== "sqlite") throw new Error("expected sqlite");
  migrate(db.orm, { migrationsFolder: MIGRATIONS });
  return db;
}

function seedOrg(db: Extract<Db, { dialect: "sqlite" }>) {
  return must(
    db.orm.insert(organizations).values({ name: "Org", slug: "org" }).returning().get(),
  );
}

describe("people CRUD (sqlite)", () => {
  it("inserts and reads back a person scoped to an org", () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const created = must(
        db.orm
          .insert(people)
          .values({
            orgId: org.id,
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          })
          .returning()
          .get(),
      );

      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.orgId).toBe(org.id);
      expect(created.firstName).toBe("Ada");
      expect(created.lastName).toBe("Lovelace");
      expect(created.phone).toBeNull();
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.deletedAt).toBeNull();

      const found = db.orm.select().from(people).where(eq(people.id, created.id)).get();
      expect(found?.email).toBe("ada@example.com");
    } finally {
      db.close();
    }
  });

  it("allows a person with only a first name (lastName + contact are optional)", () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const created = must(
        db.orm
          .insert(people)
          .values({ orgId: org.id, firstName: "Prince" })
          .returning()
          .get(),
      );
      expect(created.lastName).toBeNull();
      expect(created.email).toBeNull();
      expect(created.notes).toBeNull();
    } finally {
      db.close();
    }
  });

  it("soft-deletes by stamping deleted_at, without removing the row (§5)", () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const person = must(
        db.orm
          .insert(people)
          .values({ orgId: org.id, firstName: "Gone" })
          .returning()
          .get(),
      );

      db.orm
        .update(people)
        .set({ deletedAt: new Date() })
        .where(eq(people.id, person.id))
        .run();

      const row = db.orm.select().from(people).where(eq(people.id, person.id)).get();
      expect(row?.deletedAt).toBeInstanceOf(Date);
    } finally {
      db.close();
    }
  });

  it("orphans people when their org is hard-deleted (SET NULL, never CASCADE — §5)", () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const person = must(
        db.orm
          .insert(people)
          .values({ orgId: org.id, firstName: "Kept" })
          .returning()
          .get(),
      );

      // Hard-delete the org row itself (not the app's normal soft-delete) to fire the FK.
      db.orm.delete(organizations).where(eq(organizations.id, org.id)).run();

      const row = db.orm.select().from(people).where(eq(people.id, person.id)).get();
      expect(row).toBeDefined(); // the person survives...
      expect(row?.orgId).toBeNull(); // ...with its org link nulled, history intact.
    } finally {
      db.close();
    }
  });
});
