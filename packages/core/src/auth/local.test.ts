/**
 * The portable auth default, end to end against a real in-memory SQLite database: create a
 * user -> verify credentials -> issue a session -> resolve it -> expire/revoke. Also checks
 * two security-critical properties: the returned user never carries a password hash, and
 * deleting a user CASCADE-deletes their sessions.
 */

import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "../db/client.js";
import { organizations, sessions, users } from "../db/schema.sqlite.js";
import { createLocalAuth, sqliteAuthStore } from "./local.js";

const MIGRATIONS = new URL("../../drizzle/sqlite", import.meta.url).pathname;

function freshDb(): Extract<Db, { dialect: "sqlite" }> {
  const db = createDb(":memory:");
  if (db.dialect !== "sqlite") throw new Error("expected sqlite");
  migrate(db.orm, { migrationsFolder: MIGRATIONS });
  return db;
}

function seedOrg(db: Extract<Db, { dialect: "sqlite" }>) {
  const org = db.orm
    .insert(organizations)
    .values({ name: "Org", slug: "org" })
    .returning()
    .get();
  if (!org) throw new Error("seed failed");
  return org;
}

describe("local auth provider (sqlite)", () => {
  it("creates a user and verifies credentials, never exposing the hash", async () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const auth = createLocalAuth(sqliteAuthStore(db));
      const user = await auth.createUser({
        orgId: org.id,
        email: "admin@example.com",
        password: "s3cret-pw",
        role: "admin",
      });

      expect(user.role).toBe("admin");
      expect("passwordHash" in user).toBe(false);

      expect(
        await auth.verifyCredentials("admin@example.com", "s3cret-pw"),
      ).not.toBeNull();
      expect(await auth.verifyCredentials("admin@example.com", "wrong")).toBeNull();
      expect(await auth.verifyCredentials("nobody@example.com", "s3cret-pw")).toBeNull();
    } finally {
      db.close();
    }
  });

  it("issues a session, resolves it, and revokes it on sign-out", async () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const auth = createLocalAuth(sqliteAuthStore(db));
      const user = await auth.createUser({
        orgId: org.id,
        email: "a@b.c",
        password: "pw",
        role: "owner",
      });

      const { token } = await auth.createSession(user.id);
      expect((await auth.currentUser(token))?.id).toBe(user.id);

      expect(await auth.currentUser("bogus-token")).toBeNull();

      await auth.signOut(token);
      expect(await auth.currentUser(token)).toBeNull();
    } finally {
      db.close();
    }
  });

  it("records ip address and user agent on the session", async () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const auth = createLocalAuth(sqliteAuthStore(db));
      const user = await auth.createUser({
        orgId: org.id,
        email: "a@b.c",
        password: "pw",
        role: "admin",
      });
      await auth.createSession(user.id, {
        ipAddress: "203.0.113.5",
        userAgent: "TestAgent/1.0",
      });

      const row = db.orm.select().from(sessions).all()[0];
      expect(row?.ipAddress).toBe("203.0.113.5");
      expect(row?.userAgent).toBe("TestAgent/1.0");
    } finally {
      db.close();
    }
  });

  it("treats an expired session as invalid", async () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      let clock = new Date("2026-01-01T00:00:00Z");
      const auth = createLocalAuth(sqliteAuthStore(db), {
        now: () => clock,
        sessionTtlMs: 1000,
      });
      const user = await auth.createUser({
        orgId: org.id,
        email: "a@b.c",
        password: "pw",
        role: "viewer",
      });
      const { token } = await auth.createSession(user.id);

      clock = new Date(clock.getTime() + 2000); // advance past the 1s TTL
      expect(await auth.currentUser(token)).toBeNull();
    } finally {
      db.close();
    }
  });

  it("cascade-deletes sessions when the user row is hard-deleted", async () => {
    const db = freshDb();
    try {
      const org = seedOrg(db);
      const auth = createLocalAuth(sqliteAuthStore(db));
      const user = await auth.createUser({
        orgId: org.id,
        email: "a@b.c",
        password: "pw",
        role: "organizer",
      });
      await auth.createSession(user.id);
      expect(db.orm.select().from(sessions).all().length).toBe(1);

      db.orm.delete(users).where(eq(users.id, user.id)).run();

      expect(db.orm.select().from(sessions).all().length).toBe(0); // gone via CASCADE
    } finally {
      db.close();
    }
  });
});
