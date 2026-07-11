/**
 * The portable default AuthProvider: email + password over the bundled database, with
 * opaque, revocable sessions. This is what makes one-command self-host possible — no
 * external auth service required.
 *
 * Sessions: a random 256-bit token is generated and returned to the caller ONCE; only its
 * SHA-256 hash is stored, so a database leak can't be replayed as a live login.
 *
 * `sqliteAuthStore` is the SQLite-backed store (the primary/dev/test engine). A Postgres
 * store is the mirror parity task, deferred with the rest of the repository layer.
 */

import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { sessions, users } from "../db/schema.sqlite.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { AuthProvider, AuthStore, AuthUser, StoredUser } from "./provider.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Drop the password hash before a user leaves the auth layer. */
function toAuthUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    orgId: u.orgId,
    email: u.email,
    role: u.role,
    personId: u.personId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt,
  };
}

/** Build the portable default provider over any AuthStore. `now` is injectable for tests. */
export function createLocalAuth(
  store: AuthStore,
  opts: { now?: () => Date; sessionTtlMs?: number } = {},
): AuthProvider {
  const now = opts.now ?? (() => new Date());
  const ttlMs = opts.sessionTtlMs ?? SESSION_TTL_MS;

  return {
    async createUser(input) {
      const passwordHash = await hashPassword(input.password);
      const stored = await store.insertUser({
        orgId: input.orgId,
        email: input.email,
        passwordHash,
        role: input.role,
        personId: input.personId ?? null,
      });
      return toAuthUser(stored);
    },

    async verifyCredentials(email, password) {
      const u = await store.findUserByEmail(email);
      if (!u || u.deletedAt || !u.passwordHash) {
        // Burn equivalent hashing time so a missing / password-less account can't be told
        // apart from a wrong password by response timing (a user-enumeration guard).
        await hashPassword(password);
        return null;
      }
      const ok = await verifyPassword(password, u.passwordHash);
      return ok ? toAuthUser(u) : null;
    },

    async createSession(userId, context) {
      const token = generateToken();
      const expiresAt = new Date(now().getTime() + ttlMs);
      await store.insertSession({
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
      });
      return { token, expiresAt };
    },

    async currentUser(token) {
      const tokenHash = hashToken(token);
      const session = await store.findSessionByHash(tokenHash);
      if (!session) return null;
      if (session.expiresAt.getTime() <= now().getTime()) {
        await store.deleteSessionByHash(tokenHash); // prune the expired row
        return null;
      }
      const u = await store.findUserById(session.userId);
      if (!u || u.deletedAt) return null;
      return toAuthUser(u);
    },

    async signOut(token) {
      await store.deleteSessionByHash(hashToken(token));
    },
  };
}

/** SQLite-backed AuthStore — the primary engine. */
export function sqliteAuthStore(db: Extract<Db, { dialect: "sqlite" }>): AuthStore {
  const orm = db.orm;
  return {
    async insertUser(row) {
      const created = orm.insert(users).values(row).returning().get();
      if (!created) throw new Error("failed to insert user");
      return created;
    },
    async findUserByEmail(email) {
      return orm.select().from(users).where(eq(users.email, email)).get() ?? null;
    },
    async findUserById(id) {
      return orm.select().from(users).where(eq(users.id, id)).get() ?? null;
    },
    async insertSession(row) {
      orm.insert(sessions).values(row).run();
    },
    async findSessionByHash(tokenHash) {
      return (
        orm
          .select({
            userId: sessions.userId,
            expiresAt: sessions.expiresAt,
          })
          .from(sessions)
          .where(eq(sessions.tokenHash, tokenHash))
          .get() ?? null
      );
    },
    async deleteSessionByHash(tokenHash) {
      orm.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
    },
  };
}
