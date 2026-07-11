/**
 * @commons/core — the Commons engine. This file is the package's PUBLIC SURFACE: the few
 * things the rest of the system (and, later, separate "vertical" product packages) are
 * allowed to import. Everything else under src/ is internal. Full map: ../../ARCHITECTURE.md.
 *
 * "Vertical-neutral" (ARCHITECTURE.md §2) means core knows nothing about any specific
 * product — a club, a congregation, a league. Those products ("verticals") plug into core
 * LATER through a module registry, and core never imports their code. One engine, many
 * faces, no forks.
 *
 * Where this file sits in the build order (ARCHITECTURE.md §10 defines milestones M0–M6):
 *   • M0 — Skeleton: the workspace/build/lint/CI plumbing and the database wiring.
 *     Empty of features, but it compiles and boots.
 *   • M1 — Bedrock: the data-layer seam (createDb/getDb) plus the first domain models,
 *     Organization and Person — the CONCRETE subsystems everything else copies from.
 *   • M2 — Auth & Staff Users (this milestone): login, the role ladder, and sessions.
 *   • M3+ — the walking skeleton, the module registry, and the rest of §4's subsystems.
 *
 * Public API today: how to open a database; the Organization and Person types; and the auth
 * surface — Staff Users, the role ladder, and the pluggable auth provider.
 */

export { resolveDialect, sqliteFilename, type Dialect } from "./db/dialect.js";
export { createDb, getDb, type Db, type SqliteDb, type PgDb } from "./db/client.js";
export type { Organization, NewOrganization } from "./domain/organization.js";
export type { Person, NewPerson } from "./domain/person.js";
export {
  ROLES,
  ROLE_RANK,
  hasAtLeast,
  canManage,
  type Role,
  type StaffUser,
  type NewStaffUser,
} from "./domain/staff-user.js";
export { createLocalAuth, sqliteAuthStore } from "./auth/local.js";
export type { AuthProvider, AuthUser, AuthStore, StoredUser } from "./auth/provider.js";
