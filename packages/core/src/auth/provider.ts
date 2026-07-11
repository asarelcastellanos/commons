/**
 * The auth seam. `AuthProvider` is the interface the rest of the engine talks to for
 * everything auth-related. A portable default implements it over the bundled database (see
 * ./local.ts); a hosted deployment can swap in a managed provider behind the same shape.
 *
 * `AuthStore` is the narrow set of database operations the default provider needs — defined
 * here so the provider logic stays dialect-agnostic and each dialect supplies its own store.
 */

import type { Role, StaffUser } from "../domain/staff-user.js";

/** The safe user shape auth hands back — a StaffUser, never the password hash. */
export type AuthUser = StaffUser;

/** A user row as the store sees it: the safe fields plus the (nullable) password hash. */
export interface StoredUser extends AuthUser {
  passwordHash: string | null;
}

export interface AuthProvider {
  /** Create a staff user with a local password. */
  createUser(input: {
    orgId: string;
    email: string;
    password: string;
    role: Role;
    personId?: string | null;
  }): Promise<AuthUser>;
  /** Verify email + password. Returns the user, or null on any mismatch. */
  verifyCredentials(email: string, password: string): Promise<AuthUser | null>;
  /** Issue a session. The raw token is returned ONCE and never stored. */
  createSession(
    userId: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ token: string; expiresAt: Date }>;
  /** Resolve a raw session token to the current staff user, or null if invalid/expired. */
  currentUser(token: string): Promise<AuthUser | null>;
  /** Revoke a session by its raw token. */
  signOut(token: string): Promise<void>;
}

/** The database operations the default provider needs. One implementation per dialect. */
export interface AuthStore {
  insertUser(row: {
    orgId: string;
    email: string;
    passwordHash: string | null;
    role: Role;
    personId: string | null;
  }): Promise<StoredUser>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  insertSession(row: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void>;
  findSessionByHash(
    tokenHash: string,
  ): Promise<{ userId: string; expiresAt: Date } | null>;
  deleteSessionByHash(tokenHash: string): Promise<void>;
}
