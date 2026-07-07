/**
 * Organization CRUD, exercised against a real (in-memory) SQLite database. This is the
 * proof that the M1 data layer actually works end to end: a generated id + audit
 * timestamps on insert, soft-delete that stamps `deleted_at` without removing the row,
 * and the unique-slug constraint. Runs on the primary engine (SQLite); the parity test
 * is what gives us confidence the Postgres schema behaves the same.
 */

import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "./client.js";
import { organizations } from "./schema.sqlite.js";

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

describe("organizations CRUD (sqlite)", () => {
  it("inserts and reads back an org with a generated id + audit timestamps", () => {
    const db = freshDb();
    try {
      const created = must(
        db.orm
          .insert(organizations)
          .values({ name: "Test Org", slug: "test-org" })
          .returning()
          .get(),
      );

      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.name).toBe("Test Org");
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(created.deletedAt).toBeNull();

      const found = db.orm
        .select()
        .from(organizations)
        .where(eq(organizations.slug, "test-org"))
        .get();
      expect(found?.id).toBe(created.id);
    } finally {
      db.close();
    }
  });

  it("soft-deletes by stamping deleted_at, without removing the row (§5)", () => {
    const db = freshDb();
    try {
      const org = must(
        db.orm
          .insert(organizations)
          .values({ name: "Gone", slug: "gone" })
          .returning()
          .get(),
      );

      db.orm
        .update(organizations)
        .set({ deletedAt: new Date() })
        .where(eq(organizations.id, org.id))
        .run();

      const row = db.orm
        .select()
        .from(organizations)
        .where(eq(organizations.id, org.id))
        .get();
      expect(row).toBeDefined();
      expect(row?.deletedAt).toBeInstanceOf(Date);
    } finally {
      db.close();
    }
  });

  it("enforces the unique slug constraint", () => {
    const db = freshDb();
    try {
      db.orm.insert(organizations).values({ name: "A", slug: "dup" }).run();
      expect(() =>
        db.orm.insert(organizations).values({ name: "B", slug: "dup" }).run(),
      ).toThrow();
    } finally {
      db.close();
    }
  });
});
