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
 *   • M1 — Bedrock (this milestone): the data-layer seam (createDb/getDb) plus the first
 *     domain model, Organization. These are the first CONCRETE subsystems everything else
 *     will copy the pattern from.
 *   • M2+ — the module registry, auth, events, messaging, and the rest of §4's subsystems.
 *
 * So today this exports exactly two things: how to open a database, and the Organization
 * type. That is the whole of M1's public API.
 */

export { resolveDialect, sqliteFilename, type Dialect } from "./db/dialect.js";
export { createDb, getDb, type Db, type SqliteDb, type PgDb } from "./db/client.js";
export type { Organization, NewOrganization } from "./domain/organization.js";
export type { Person, NewPerson } from "./domain/person.js";
